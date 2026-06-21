<!-- SYNOPSIS: BuilderOS Remediation: Amendment 01 AI Council - TODO 5 (G4) - LoRA Fine-tuning Llama/Mistral on LCL Language -->

# BuilderOS Remediation: Amendment 01 AI Council - TODO 5 (G4) - LoRA Fine-tuning Llama/Mistral on LCL Language

## Blueprint Enhancement Memo

This memo addresses the unchecked blueprint task: "Phase 3: LoRA fine-tune Llama/Mistral on LCL language (FUTURE — needs A100) `[safe]`". It outlines the next smallest buildable slice, focusing on preparatory steps given the current ambiguities and hardware requirements.

### 1. Blocking Ambiguity or Founder Decision List

The following items require founder or AI Council decisions/clarifications before proceeding with full implementation:

*   **LCL Language Definition**: A precise definition of "LCL language" is required. This includes its scope, specific linguistic characteristics, target domain, and expected data format.
*   **LCL Data Source & Collection Strategy**: Identify the primary source(s) for LCL language data. Is it internal, external, or requires specific collection efforts? Define the strategy for data acquisition, annotation (if necessary), and storage.
*   **Target Model Variant**: Specify the exact Llama or Mistral model variant (e.g., Llama-2-7B, Mistral-7B-v0.2) to be used as the base for LoRA fine-tuning.
*   **Fine-tuning Objectives & Metrics**: Define the specific performance objectives (e.g., perplexity, task-specific accuracy, generation quality) and the evaluation metrics for the fine-tuned model.
*   **A100 Resource Provisioning**: Confirm the timeline and budget for acquiring or provisioning A100 GPU resources. This is a hard dependency for actual fine-tuning.
*   **LoRA Hyperparameters**: Initial guidance on desired LoRA rank, alpha, and other key training hyperparameters (e.g., batch size, learning rate, epochs) for initial experiments.

### 2. Already-Settled Constraints

*   **Fine-tuning Method**: LoRA (Low-Rank Adaptation) is the mandated fine-tuning technique.
*   **Base Models**: Llama or Mistral architectures are the approved base models.
*   **Target Language**: Fine-tuning must be performed on "LCL language".
*   **Hardware Requirement**: A100 GPUs are explicitly required for the fine-tuning phase.
*   **Scope**: The task is marked `[safe]`, indicating it is an internal development effort with no immediate impact on LifeOS user features or TSOS customer-facing surfaces.

### 3. Smallest Buildable Next Slice

The smallest buildable next slice focuses on foundational research, environment setup, and data pipeline scaffolding, deferring A100-dependent training.

1.  **LCL Language Definition & Data Strategy Documentation**: Research and document potential definitions, data sources, and collection strategies for "LCL language".
2.  **Local Development Environment Setup**: Establish a Python environment with necessary libraries (`transformers`, `peft`, `torch` - CPU/GPU compatible, `datasets`) for local development and testing of data pipelines.
3.  **Data Preprocessing Proof-of-Concept (PoC)**: Develop a script to load and preprocess a dummy or small public dataset (simulating LCL language) to validate the data pipeline structure. This includes tokenization and formatting for LoRA.
4.  **LoRA Configuration Scaffolding**: Create initial Python code to define `peft.