# CareerLadderSim

A privacy-first platform for employee career ladder simulation, allowing staff to explore potential promotions and career trajectories using encrypted personal data. Fully Homomorphic Encryption (FHE) ensures that sensitive employee information remains confidential while enabling accurate simulations and analytics.

## Project Background

Organizations often face challenges in career planning and talent development:

- **Privacy Concerns**: Employees hesitate to share personal performance or skill data for simulations.  
- **Uncertainty in Promotions**: Standardized career ladders do not reflect personalized employee trajectories.  
- **Data Silos**: Career planning tools often rely on centralized HR data, raising trust issues.  
- **Limited Transparency**: Employees lack clarity on potential career paths without exposing their private data.

CareerLadderSim addresses these challenges by:

- Encrypting employee profiles end-to-end.  
- Using FHE to simulate promotions and career paths without revealing raw personal data.  
- Providing transparent, yet confidential, insights for HR and employees.  
- Encouraging informed career development while protecting privacy.

## Features

### Core Functionality

- **Encrypted Employee Profiles**: Store performance, skills, and experience securely.  
- **Career Ladder Simulation**: Evaluate promotion potential and career growth scenarios on encrypted data.  
- **Interactive Dashboards**: Visualize career paths, probabilities of advancement, and skill gaps.  
- **Custom Scenario Modeling**: Test different promotion criteria or HR policies without exposing sensitive data.  
- **Anonymous Benchmarking**: Compare outcomes across departments without revealing individual identities.

### Privacy & Anonymity

- **Client-side Encryption**: Employee data is encrypted before leaving their device.  
- **FHE-Powered Simulation**: All computations occur on encrypted data to prevent exposure.  
- **Immutable Records**: Simulation history cannot be tampered with.  
- **No Personal Identifiers Stored**: Ensures anonymity even within aggregated insights.

## Architecture

### Backend

- **FHE Simulation Engine**: Computes promotion probabilities, skill matching, and career projections securely.  
- **Encrypted Storage**: Stores all employee data, simulations, and results in encrypted form.  
- **API Gateway**: Handles encrypted data submission, retrieval, and simulation requests.

### Frontend Application

- **React + TypeScript**: Intuitive interface for employees and HR managers.  
- **Real-time Dashboards**: Interactive charts, graphs, and career ladder visualizations.  
- **Scenario Testing**: Create hypothetical promotion policies or employee skill growth paths.  
- **Anonymous Comparison Tools**: Compare aggregated career trajectories without exposing individuals.

### Integration

- Supports HR systems and internal talent management tools.  
- Allows secure ingestion of historical employee data for benchmarking.  
- Mobile and web compatible for easy access.

## Technology Stack

- **FHE Libraries**: Advanced homomorphic encryption for secure career modeling.  
- **Node.js + Express**: Backend API and computation orchestration.  
- **React 18 + TypeScript**: Frontend UI and interactive dashboards.  
- **PostgreSQL (Encrypted)**: Stores encrypted employee and simulation data.  
- **WebAssembly (WASM)**: High-performance client-side encryption.

## Installation

### Prerequisites

- Node.js 18+  
- npm / yarn / pnpm  
- FHE library setup for simulation computations  

### Running Locally

1. Clone the repository.  
2. Install dependencies: `npm install`  
3. Start backend: `npm run start:backend`  
4. Start frontend: `npm run start:frontend`  
5. Add employee data (encrypted) and explore career simulations.

## Usage Examples

- **Promotion Forecasting**: Assess likelihood of employees advancing in current career paths.  
- **Skill Gap Analysis**: Identify skills needed for next levels without exposing employee details.  
- **Policy Testing**: Evaluate new HR promotion rules securely on encrypted data.  
- **Team Planning**: HR managers can simulate team growth while maintaining privacy.

## Security Features

- **Encrypted Submission**: Employee data encrypted before leaving device.  
- **Immutable Simulation Records**: All simulation results stored securely and unalterable.  
- **Anonymity by Design**: No personal identifiers are revealed during aggregation or analysis.  
- **Transparent FHE Computation**: Results verifiable without exposing raw data.

## Roadmap

- **Enhanced Predictive Analytics**: AI-driven FHE models for promotion forecasting.  
- **Multi-level Career Paths**: Simulate multiple ladder structures within the organization.  
- **Real-time Feedback Integration**: Incorporate continuous performance reviews securely.  
- **Cross-department Benchmarking**: Aggregate insights across teams without compromising privacy.  
- **Mobile-optimized Interface**: Employees can explore career paths on any device.  
- **DAO-like Governance**: Employee-driven improvements and policy experimentation.

## Conclusion

CareerLadderSim empowers employees and HR to simulate career advancement securely, combining confidentiality with actionable insights. By leveraging FHE, organizations can protect sensitive data while promoting transparency and fair talent development.

*Built with ❤️ for a privacy-conscious, transparent, and insightful HR experience.*
