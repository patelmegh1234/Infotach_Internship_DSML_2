"""
AtmoGraph GNN — Training Pipeline
===================================
Training loop, evaluation metrics, and checkpoint management
for the supply chain delay prediction GNN.

Week 1+2 Deliverable (Megh Patel — Team Leader)
"""

from __future__ import annotations

import os
import time
import json
from pathlib import Path
from typing import Optional

import torch
import torch.nn as nn
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR
from torch_geometric.data import Data, DataLoader
from loguru import logger

from gnn.model import create_model


class GNNTrainer:
    """
    Training and evaluation manager for the Supply Chain GNN.

    Supports:
        - Training with MSE / Huber loss
        - Validation with MAE and RMSE metrics
        - Learning rate scheduling (Cosine Annealing)
        - Model checkpointing (save best by val loss)
        - Training history logging
    """

    def __init__(
        self,
        model_type: str = "disruption_aware",
        hidden_channels: int = 64,
        num_sage_layers: int = 3,
        dropout: float = 0.3,
        learning_rate: float = 1e-3,
        weight_decay: float = 1e-4,
        loss_fn: str = "huber",         # 'mse' | 'huber'
        device: Optional[str] = None,
        checkpoint_dir: str = "./models",
    ):
        self.device = torch.device(
            device if device else ("cuda" if torch.cuda.is_available() else "cpu")
        )
        logger.info(f"Training on device: {self.device}")

        # Initialise model
        self.model = create_model(
            model_type=model_type,
            hidden_channels=hidden_channels,
            num_sage_layers=num_sage_layers,
            dropout=dropout,
        ).to(self.device)

        # Optimiser & scheduler
        self.optimizer = optim.AdamW(
            self.model.parameters(),
            lr=learning_rate,
            weight_decay=weight_decay,
        )

        # Loss function
        if loss_fn == "huber":
            self.criterion = nn.HuberLoss(delta=10.0)  # delta = 10 days
        elif loss_fn == "mse":
            self.criterion = nn.MSELoss()
        else:
            raise ValueError(f"Unknown loss function: {loss_fn}")

        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        self.history: dict[str, list[float]] = {
            "train_loss": [],
            "val_loss": [],
            "val_mae": [],
            "val_rmse": [],
        }
        self.best_val_loss = float("inf")

    def train_epoch(self, train_loader: DataLoader) -> float:
        """Run one training epoch. Returns average training loss."""
        self.model.train()
        total_loss = 0.0
        total_nodes = 0

        for batch in train_loader:
            batch = batch.to(self.device)
            self.optimizer.zero_grad()

            out = self.model(batch.x, batch.edge_index, batch=batch.batch)
            pred_delay = out["delay_days"]

            if batch.y is None:
                continue

            loss = self.criterion(pred_delay, batch.y)
            loss.backward()

            # Gradient clipping to prevent exploding gradients
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            self.optimizer.step()

            total_loss += loss.item() * batch.num_nodes
            total_nodes += batch.num_nodes

        return total_loss / max(total_nodes, 1)

    @torch.no_grad()
    def evaluate(self, val_loader: DataLoader) -> dict[str, float]:
        """Evaluate model on validation set. Returns dict of metrics."""
        self.model.eval()
        all_preds, all_targets = [], []

        for batch in val_loader:
            batch = batch.to(self.device)
            out = self.model(batch.x, batch.edge_index, batch=batch.batch)
            all_preds.append(out["delay_days"])
            if batch.y is not None:
                all_targets.append(batch.y)

        if not all_targets:
            return {"val_loss": 0.0, "val_mae": 0.0, "val_rmse": 0.0}

        preds = torch.cat(all_preds, dim=0)
        targets = torch.cat(all_targets, dim=0)

        val_loss = self.criterion(preds, targets).item()
        mae = (preds - targets).abs().mean().item()
        rmse = ((preds - targets) ** 2).mean().sqrt().item()

        return {"val_loss": val_loss, "val_mae": mae, "val_rmse": rmse}

    def train(
        self,
        train_loader: DataLoader,
        val_loader: DataLoader,
        epochs: int = 100,
        scheduler_t_max: int = 50,
    ) -> dict[str, list[float]]:
        """
        Full training loop.

        Args:
            train_loader:     PyG DataLoader for training data.
            val_loader:       PyG DataLoader for validation data.
            epochs:           Number of training epochs.
            scheduler_t_max:  CosineAnnealingLR T_max parameter.

        Returns:
            Training history dict.
        """
        scheduler = CosineAnnealingLR(self.optimizer, T_max=scheduler_t_max)

        logger.info(f"Starting training for {epochs} epochs...")
        start_time = time.time()

        for epoch in range(1, epochs + 1):
            train_loss = self.train_epoch(train_loader)
            val_metrics = self.evaluate(val_loader)
            scheduler.step()

            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_metrics["val_loss"])
            self.history["val_mae"].append(val_metrics["val_mae"])
            self.history["val_rmse"].append(val_metrics["val_rmse"])

            # Checkpoint best model
            if val_metrics["val_loss"] < self.best_val_loss:
                self.best_val_loss = val_metrics["val_loss"]
                self.save_checkpoint("best_model.pt")
                logger.info(f"✅ New best model at epoch {epoch}")

            # Log progress
            if epoch % 10 == 0 or epoch == 1:
                elapsed = time.time() - start_time
                logger.info(
                    f"Epoch {epoch:4d}/{epochs} | "
                    f"Train Loss: {train_loss:.4f} | "
                    f"Val Loss: {val_metrics['val_loss']:.4f} | "
                    f"MAE: {val_metrics['val_mae']:.2f}d | "
                    f"RMSE: {val_metrics['val_rmse']:.2f}d | "
                    f"Time: {elapsed:.0f}s"
                )

        # Save final model and history
        self.save_checkpoint("final_model.pt")
        self._save_history()
        logger.info(f"Training complete! Best val loss: {self.best_val_loss:.4f}")
        return self.history

    def save_checkpoint(self, filename: str) -> None:
        """Save model checkpoint."""
        path = self.checkpoint_dir / filename
        torch.save(
            {
                "model_state_dict": self.model.state_dict(),
                "optimizer_state_dict": self.optimizer.state_dict(),
                "best_val_loss": self.best_val_loss,
                "history": self.history,
            },
            path,
        )

    def load_checkpoint(self, filename: str) -> None:
        """Load model from checkpoint."""
        path = self.checkpoint_dir / filename
        checkpoint = torch.load(path, map_location=self.device)
        self.model.load_state_dict(checkpoint["model_state_dict"])
        self.optimizer.load_state_dict(checkpoint["optimizer_state_dict"])
        self.best_val_loss = checkpoint.get("best_val_loss", float("inf"))
        self.history = checkpoint.get("history", self.history)
        logger.info(f"Loaded checkpoint from {path}")

    def _save_history(self) -> None:
        """Save training history to JSON."""
        path = self.checkpoint_dir / "training_history.json"
        with open(path, "w") as f:
            json.dump(self.history, f, indent=2)
