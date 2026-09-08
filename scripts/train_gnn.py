"""
AtmoGraph — GNN End-to-End Training Pipeline
=============================================
Trains the Disruption-Aware Graph Neural Network (GraphSAGE + GATv2)
to predict multi-hop supply chain delay ripple effects.

Week 3 Deliverable (Issue #5: Megh Patel — Team Leader)

Requirements:
  - Train model for 100 epochs
  - Achieve val_mae < 15 days
  - Save checkpoint to models/best_model.pt
  - Log training curves (loss, MAE, RMSE) to models/training_history.json

Usage:
    python scripts/train_gnn.py --epochs 100 --batch-size 16
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

import torch
from loguru import logger
from torch_geometric.loader import DataLoader

# Setup paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
BACKEND_DIR = PROJECT_ROOT / "backend"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from gnn.trainer import GNNTrainer
from gnn.inference import GNNInferenceEngine
from scripts.generate_training_data import (
    load_from_mock_json,
    load_from_neo4j,
    generate_pyg_dataset,
)


def ensure_datasets_exist(
    data_dir: Path,
    num_scenarios: int = 600,
    seed: int = 42,
) -> tuple[Path, Path, Path]:
    """Verify preprocessed training/validation datasets exist or generate them."""
    train_path = data_dir / "train_data.pt"
    val_path = data_dir / "val_data.pt"
    test_path = data_dir / "test_data.pt"

    if train_path.exists() and val_path.exists() and test_path.exists():
        # Check if train dataset has sufficient scenarios
        try:
            sample = torch.load(train_path, weights_only=False)
            if len(sample) >= 100:
                logger.info(f"Using existing PyG datasets in {data_dir} ({len(sample)} training graphs)")
                return train_path, val_path, test_path
        except Exception:
            pass

    logger.info(f"Generating fresh {num_scenarios}-scenario dataset...")
    mock_file = PROJECT_ROOT / "data" / "mock" / "supply_chain_nodes.json"
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", None)

    graph = load_from_neo4j(neo4j_uri, neo4j_user, neo4j_password)
    if graph is None:
        nodes, edges = load_from_mock_json(mock_file)
    else:
        nodes, edges = graph

    pyg_graphs = generate_pyg_dataset(nodes, edges, num_scenarios=num_scenarios, seed=seed)

    n_total = len(pyg_graphs)
    n_train = int(n_total * 0.80)
    n_val = int(n_total * 0.10)

    import random
    rng = random.Random(seed)
    indices = list(range(n_total))
    rng.shuffle(indices)

    train_data = [pyg_graphs[i] for i in indices[:n_train]]
    val_data = [pyg_graphs[i] for i in indices[n_train:n_train + n_val]]
    test_data = [pyg_graphs[i] for i in indices[n_train + n_val:]]

    data_dir.mkdir(parents=True, exist_ok=True)
    torch.save(train_data, train_path)
    torch.save(val_data, val_path)
    torch.save(test_data, test_path)

    logger.info(f"Dataset generated: Train={len(train_data)}, Val={len(val_data)}, Test={len(test_data)}")
    return train_path, val_path, test_path


def train_supply_chain_gnn(
    epochs: int = 100,
    batch_size: int = 16,
    learning_rate: float = 1e-3,
    hidden_channels: int = 64,
    num_sage_layers: int = 3,
    dropout: float = 0.3,
    model_type: str = "disruption_aware",
    loss_fn: str = "huber",
    device: str | None = None,
    checkpoint_dir: str = "models",
    data_dir: str = "data/processed",
    num_scenarios: int = 600,
    seed: int = 42,
) -> dict[str, Any]:
    """End-to-end training procedure satisfying all Issue #5 deliverables."""

    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

    ckpt_path = PROJECT_ROOT / checkpoint_dir
    ckpt_path.mkdir(parents=True, exist_ok=True)
    data_path = PROJECT_ROOT / data_dir

    logger.info("=" * 65)
    logger.info(f"AtmoGraph GNN Training Pipeline (Issue #5)")
    logger.info(f"  Model Type:       {model_type}")
    logger.info(f"  Epochs:           {epochs}")
    logger.info(f"  Batch Size:       {batch_size}")
    logger.info(f"  Hidden Channels:  {hidden_channels}")
    logger.info(f"  Learning Rate:    {learning_rate}")
    logger.info(f"  Loss Function:    {loss_fn} (Huber delta=10.0)")
    logger.info(f"  Checkpoint Dir:   {ckpt_path}")
    logger.info("=" * 65)

    # 1. Ensure dataset exists
    train_file, val_file, test_file = ensure_datasets_exist(data_path, num_scenarios=num_scenarios, seed=seed)

    logger.info(f"Loading datasets into PyG DataLoader (batch_size={batch_size})...")
    train_data = torch.load(train_file, weights_only=False)
    val_data = torch.load(val_file, weights_only=False)
    test_data = torch.load(test_file, weights_only=False)

    train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_data, batch_size=batch_size, shuffle=False)
    test_loader = DataLoader(test_data, batch_size=batch_size, shuffle=False)

    # 2. Instantiate GNNTrainer
    trainer = GNNTrainer(
        model_type=model_type,
        hidden_channels=hidden_channels,
        num_sage_layers=num_sage_layers,
        dropout=dropout,
        learning_rate=learning_rate,
        loss_fn=loss_fn,
        device=device,
        checkpoint_dir=str(ckpt_path),
    )

    # 3. Train for specified epochs
    start_time = time.time()
    history = trainer.train(
        train_loader=train_loader,
        val_loader=val_loader,
        epochs=epochs,
    )
    total_time = time.time() - start_time

    # 4. Load best checkpoint and evaluate on test set
    best_model_file = ckpt_path / "best_model.pt"
    trainer.load_checkpoint("best_model.pt")
    test_metrics = trainer.evaluate(test_loader)

    # 5. Synchronise checkpoint and history to backend/models for runtime parity
    backend_models_dir = BACKEND_DIR / "models"
    backend_models_dir.mkdir(parents=True, exist_ok=True)
    for fname in ["best_model.pt", "final_model.pt", "training_history.json"]:
        src = ckpt_path / fname
        if src.exists():
            shutil.copy2(src, backend_models_dir / fname)

    # Also make a copy named gnn_model.pt for any legacy references
    if best_model_file.exists():
        shutil.copy2(best_model_file, ckpt_path / "gnn_model.pt")
        shutil.copy2(best_model_file, backend_models_dir / "gnn_model.pt")

    # 6. Verify Deliverables and Print Summary
    best_val_mae = min(history["val_mae"]) if history["val_mae"] else 0.0
    best_val_rmse = min(history["val_rmse"]) if history["val_rmse"] else 0.0
    final_train_loss = history["train_loss"][-1] if history["train_loss"] else 0.0
    final_val_loss = history["val_loss"][-1] if history["val_loss"] else 0.0

    logger.info("=" * 65)
    logger.info("TRAINING PIPELINE SUMMARY")
    logger.info("=" * 65)
    logger.info(f"Total Training Time:    {total_time:.1f}s ({total_time / 60:.2f} min)")
    logger.info(f"Final Train Loss:       {final_train_loss:.4f}")
    logger.info(f"Final Val Loss:         {final_val_loss:.4f}")
    logger.info(f"Best Val MAE:           {best_val_mae:.2f} days")
    logger.info(f"Best Val RMSE:          {best_val_rmse:.2f} days")
    logger.info(f"Test Set Loss:          {test_metrics['val_loss']:.4f}")
    logger.info(f"Test Set MAE:           {test_metrics['val_mae']:.2f} days")
    logger.info(f"Test Set RMSE:          {test_metrics['val_rmse']:.2f} days")
    logger.info(f"Best Checkpoint:        {best_model_file}")
    logger.info(f"Training History JSON:  {ckpt_path / 'training_history.json'}")

    # Verify target metric requirement (< 15 days)
    mae_threshold = 15.0
    if best_val_mae < mae_threshold:
        logger.info(f"🎉 SUCCESS: Validation MAE ({best_val_mae:.2f} days) achieved target threshold (< {mae_threshold} days)!")
    else:
        logger.warning(f"⚠️ Validation MAE ({best_val_mae:.2f} days) is above {mae_threshold} days.")

    return {
        "best_val_mae": best_val_mae,
        "best_val_rmse": best_val_rmse,
        "test_mae": test_metrics["val_mae"],
        "test_rmse": test_metrics["val_rmse"],
        "checkpoint_path": str(best_model_file),
        "history_path": str(ckpt_path / "training_history.json"),
        "total_time_seconds": total_time,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="AtmoGraph GNN Training Runner")
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs (default: 100)")
    parser.add_argument("--batch-size", type=int, default=16, help="DataLoader batch size (default: 16)")
    parser.add_argument("--lr", type=float, default=1e-3, help="Learning rate (default: 0.001)")
    parser.add_argument("--hidden-dim", type=int, default=64, help="GNN hidden dimension (default: 64)")
    parser.add_argument("--num-layers", type=int, default=3, help="GraphSAGE layers (default: 3)")
    parser.add_argument("--dropout", type=float, default=0.3, help="Dropout probability (default: 0.3)")
    parser.add_argument("--model-type", type=str, default="disruption_aware", choices=["baseline", "disruption_aware"])
    parser.add_argument("--loss-fn", type=str, default="huber", choices=["huber", "mse"])
    parser.add_argument("--checkpoint-dir", type=str, default="models", help="Folder to save checkpoints")
    parser.add_argument("--data-dir", type=str, default="data/processed", help="Folder with processed PyG data")
    parser.add_argument("--num-scenarios", type=int, default=600, help="Scenarios to generate if data missing")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument("--device", type=str, default=None, help="Device: 'cuda' or 'cpu'")
    args = parser.parse_args()

    results = train_supply_chain_gnn(
        epochs=args.epochs,
        batch_size=args.batch_size,
        learning_rate=args.lr,
        hidden_channels=args.hidden_dim,
        num_sage_layers=args.num_layers,
        dropout=args.dropout,
        model_type=args.model_type,
        loss_fn=args.loss_fn,
        device=args.device,
        checkpoint_dir=args.checkpoint_dir,
        data_dir=args.data_dir,
        num_scenarios=args.num_scenarios,
        seed=args.seed,
    )

    if results["best_val_mae"] >= 15.0:
        logger.error("Model did not achieve val_mae < 15 days requirement.")
        sys.exit(1)


if __name__ == "__main__":
    main()
