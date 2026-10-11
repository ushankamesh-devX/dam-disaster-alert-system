# Contributing to Dam Disaster Alert System

Thank you for your interest in contributing to the Dam Disaster Alert System! This document provides guidelines and instructions for contributing to our project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

We are committed to providing a welcoming and inspiring community for all. Please read and adhere to our Code of Conduct:

- Be respectful and inclusive
- Welcome diverse perspectives and experiences
- Focus on what is best for the community
- Show empathy towards other community members
- Report unacceptable behavior to the project maintainers

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **Java JDK** (v11 or higher)
- **MySQL** (v5.7 or higher)
- **Git**
- **Docker** (optional, for containerized setup)

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/dam-disaster-alert-system.git
   cd dam-disaster-alert-system
   ```

3. **Create a new branch** for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Set up the API server**:
   ```bash
   cd api
   mvn clean install
   mvn spring-boot:run
   ```

5. **Set up the mobile app**:
   ```bash
   cd app
   npm install
   npx expo start
   ```

6. **Set up the web application**:
   ```bash
   cd web
   npm install
   npm run dev
   ```

## How to Contribute

There are many ways to contribute to this project:

### 1. Reporting Bugs

If you find a bug, please create an issue with:
- A clear descriptive title
- A detailed description of the issue
- Steps to reproduce the problem
- Expected behavior vs actual behavior
- Screenshots or error logs (if applicable)
- Your environment details (OS, browser, versions, etc.)

### 2. Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:
- A clear descriptive title
- Detailed description of the suggested enhancement
- Possible implementation approach
- Use cases and benefits
- Any relevant mockups or examples

### 3. Code Contributions

We welcome pull requests! Here's how to contribute code:

#### Step 1: Create a Feature Branch
```bash
git checkout -b feature/descriptive-feature-name
```

#### Step 2: Make Your Changes
- Follow the coding standards (see below)
- Write clear, well-documented code
- Add tests for new functionality
- Keep commits atomic and logical

#### Step 3: Test Your Changes
```bash
# For API
cd api
mvn test

# For Mobile App
cd app
npm test

# For Web Application
cd web
npm test
```

#### Step 4: Keep Your Branch Updated
```bash
git fetch origin
git rebase origin/main
```

## Pull Request Process

1. **Ensure tests pass**: Run all tests locally before submitting
2. **Update documentation**: If your changes affect user-facing features, update relevant docs
3. **Create a descriptive PR title**: Use the format `[Type] Description` (e.g., `[Feature] Add email notifications`)
4. **Provide a detailed PR description**:
   - What problem does this solve?
   - How did you approach it?
   - What testing did you do?
   - Any breaking changes?
   - Related issues or PRs

5. **Link related issues**: Reference any issues your PR addresses using `#issue-number`
6. **Be open to feedback**: The review process is collaborative - be ready to discuss and iterate
7. **Sign off on your commits**: Use `git commit -s` to add a sign-off

### PR Review Guidelines

- Expect reviewers to provide constructive feedback
- Respond to comments and address concerns
- Make requested changes in new commits (don't force push during review)
- Once approved, maintainers will merge your PR

## Coding Standards

### JavaScript/TypeScript

- Use modern ES6+ syntax
- Follow ESLint configuration in the project
- Use meaningful variable and function names
- Add JSDoc comments for functions and complex logic
- Maximum line length: 100 characters
- Use 2 spaces for indentation

Example:
```typescript
/**
 * Calculates the risk level based on sensor data
 * @param {number} waterLevel - Current water level in meters
 * @param {number} threshold - Critical water level threshold
 * @returns {string} Risk level: 'low', 'medium', 'high', 'critical'
 */
function calculateRiskLevel(waterLevel: number, threshold: number): string {
  // Implementation
}
```

### Java

- Follow Google Java Style Guide
- Use meaningful class and method names
- Add JavaDoc comments for public methods
- Use 4 spaces for indentation
- Keep methods focused and under 30 lines
- Use proper exception handling

Example:
```java
/**
 * Retrieves all active alerts for a specific dam
 * @param damId the unique identifier of the dam
 * @return a list of active alerts
 * @throws DamNotFoundException if the dam does not exist
 */
public List<Alert> getAlertsByDamId(Long damId) {
  // Implementation
}
```

### CSS/Tailwind

- Use Tailwind CSS utility classes
- Avoid writing custom CSS unless absolutely necessary
- Use consistent spacing and sizing scales
- Mobile-first responsive design approach

### SQL

- Use meaningful table and column names
- Always include proper indexing
- Add foreign key constraints
- Include comments for complex queries
- Use consistent formatting and indentation

## Commit Message Guidelines

Write clear, descriptive commit messages that explain what and why:

### Format
```
[Type] Brief summary (50 characters or less)

Detailed explanation of the changes (wrap at 72 characters).
Explain the problem you are solving and how your changes address it.

- Bullet point for specific change
- Another specific change
- Related issue: #123
```

### Types
- `[Feature]` - New feature
- `[Fix]` - Bug fix
- `[Docs]` - Documentation changes
- `[Style]` - Code style changes (no functional changes)
- `[Refactor]` - Code refactoring
- `[Test]` - Adding or updating tests
- `[Chore]` - Maintenance tasks

### Examples
```
[Feature] Add email notification system for critical alerts

Users can now receive email notifications when critical alerts
are triggered. Implements notification preferences in user settings.

- Added NotificationService class
- Created email template system
- Added notification preference UI component
- Related issue: #45
```

```
[Fix] Resolve water level sensor data parsing error

Fixed an issue where sensor readings with decimal values were
being truncated, causing inaccurate alert thresholds.

- Updated SensorDataParser to handle decimal values
- Added unit tests for decimal parsing
- Related issue: #78
```

## Reporting Bugs

When reporting a bug, include:

1. **Title**: Clear, descriptive title
2. **Environment**:
   - OS and version
   - Browser (if applicable)
   - Application version
   - Java/Node version

3. **Steps to Reproduce**:
   ```
   1. Navigate to...
   2. Click on...
   3. Observe...
   ```

4. **Expected vs Actual Behavior**:
   - What you expected to happen
   - What actually happened

5. **Logs and Screenshots**:
   - Error messages or stack traces
   - Screenshots or screen recordings
   - Network requests (if applicable)

## Suggesting Enhancements

Enhancement suggestions should include:

1. **Title**: What is this enhancement about?
2. **Description**: Detailed explanation of the suggested enhancement
3. **Use Case**: Why would this be useful?
4. **Proposed Solution**: How could this be implemented?
5. **Alternatives**: Other solutions you've considered
6. **Priority**: How important is this? (Low, Medium, High)

## Additional Resources

- [Project README](./README.md)
- [Architecture Documentation](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/README-API.md)
- [Database Configuration](./docs/DATABASE-CONFIG.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## Questions?

If you have questions or need clarification, feel free to:
- Open a GitHub issue with your question
- Check existing documentation and issues
- Reach out to the project maintainers

## Recognition

Contributors are recognized in our project! Every contribution, no matter the size, helps make this project better. Thank you for contributing to the Dam Disaster Alert System!

---

**Happy contributing! 🚀**
