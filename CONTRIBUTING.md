# Contributing to FlinkGuard

We welcome contributions to FlinkGuard! Please read through these guidelines before submitting a pull request or issue.

## Development Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Yashasghnnsj/SPA-1.git
   cd SPA-1
   ```

2. **Set up Python Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements-ml.txt
   ```

3. **Set up Node Environment**:
   ```bash
   npm install
   ```

## Code Guidelines
- Keep Python code PEP-8 compliant.
- Ensure all API endpoints include Pydantic input models with strict validation.
- Preserve existing docstrings and comments.
- Test both offline fallback simulation and live API connections before submitting PRs.
