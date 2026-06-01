BuilderOS Blueprint Enhancement Memo: Amendment 01 AI Council - LoRA Fine-tuning LCL Language
Source Blueprint Section: Phase 3: LoRA fine-tune Llama/Mistral on LCL language (FUTURE — needs A100) `[safe]`
This memo outlines the next buildable slice for the LoRA fine-tuning task, addressing current ambiguities and defining initial steps.
---
1. Blocking Ambiguity or Founder Decision List
-   LCL Language Definition: A precise specification and initial corpus for "LCL language" is required. What are its characteristics, grammar, and vocabulary? What data sources will be used to construct the corpus?
-   Base Model Selection: Which specific Llama or Mistral variant (e.g., Llama 2 7B, Mistral 7B Instruct) will be the target for fine-tuning? This impacts resource requirements and performance.
-   Fine-tuning Objective: What specific downstream task or performance metric is the LoRA fine-tune intended to optimize? (e.g., improved coherence, specific domain understanding, summarization quality).
-   A100 Access Strategy: A concrete plan for acquiring or scheduling access to A100 GPUs is needed, including budget and timeline.
-   LoRA Hyperparameters: Initial guidance on LoRA rank, alpha, and other key hyperparameters (e.g., learning rate, batch size) is needed, or a strategy for their determination.
-   Evaluation Metrics & Dataset: Definition of the specific metrics and a dedicated evaluation dataset to measure the success of the fine-tuning.
2. Already-Settled Constraints
-   Methodology: LoRA (Low-Rank Adaptation) for efficient fine-tuning.
-   Base Models: Restricted to Llama or Mistral families.
-   Target Language: "LCL language" (definition pending).
-   Hardware Prerequisite: A100 GPUs are required for the full fine-tuning process.
-   Current Status: Marked as "FUTURE," indicating preparatory work can begin without immediate A100 access.
3. Smallest Buildable Next Slice
The smallest buildable next slice focuses on foundational data and research, deferring A100-dependent training.
-   LCL Language Corpus Definition & Initial Collection: Define the scope, sources, and initial collection strategy for the LCL language corpus. Begin collecting a small, representative dataset.
-   LoRA Research & Tooling Setup: Research best practices for LoRA fine-tuning Llama/Mistral models. Set up a basic development environment (e.g., Python, Hugging Face `transformers`, `peft`, `trl`) on a CPU or smaller GPU for script development and testing with dummy data.
-   Evaluation Framework Definition: Outline the proposed evaluation metrics and identify potential sources or methods for creating an evaluation dataset for LCL language.
4. Exact Safe-Scope Files BuilderOS Should Touch First
-   `docs/projects/builderos-remediation/amendment-01-ai-council-lora-research.md`: New document for LoRA best practices, model selection rationale, and hyperparameter research.
-   `data/lcl_language/README.md`: New document defining the LCL language corpus, data sources, collection methodology, and initial dataset statistics.
-   `scripts/data_prep/lcl_corpus_collector.py`: New placeholder script for initial LCL language data collection and preprocessing (e.g., tokenization, formatting).
-   `config/model_tuning/lora_base_config.yaml`: New placeholder configuration file for LoRA parameters and training settings (to be refined).
5. Required Verifier/Runtime Checks
-   LCL Corpus Existence: Verify `data/lcl_language/README.md` exists and describes a defined corpus.
-   Initial Data Collection: Verify `scripts/data_prep/lcl_corpus_collector.py` executes without error and produces a small, valid LCL language dataset (e.g., `data/lcl_language/initial_corpus.jsonl`).
-   Environment Setup: Verify that the core Python environment with `transformers`, `peft`, `trl` is installable and functional on a non-A100 machine.
-   Config File Validity: Verify `config/model_tuning/lora_base_config.yaml` is a valid YAML structure.
6. Stop Conditions
-   LCL Language Corpus Defined: The `data/lcl_language/README.md` is complete with a clear definition and initial collection strategy.
-   Initial LCL Dataset Collected: A small, representative LCL language dataset (e.g., 1000-5000 samples) has been collected and preprocessed using `scripts/data_prep/lcl_corpus_collector.py`.
-   LoRA Research Documented: `docs/projects/builderos-remediation/amendment-01-ai-council-lora-research.md` contains initial findings on model selection, hyperparameters, and tooling.
-   Evaluation Framework Outlined: The evaluation metrics and strategy are documented.
-   A100 Access Plan: A clear plan for A100 access (acquisition or scheduling) is established and documented.
-   Next Blueprint Ready: The output of this slice enables the creation of a subsequent blueprint for the actual A100-dependent fine-tuning phase.