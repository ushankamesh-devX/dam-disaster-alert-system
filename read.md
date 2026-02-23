# Dam Disaster Alert System

A critical setup designed to monitor, detect, and warn people and authorities about potential or ongoing dam-related emergencies such as structural failure, overtopping, or sudden water releases.

## 🚀 Tech Stack

- **Framework**: [Expo](https://expo.dev) (React Native)
- **Styling**: [NativeWind](https://www.nativewind.dev) / [Tailwind CSS](https://tailwindcss.com)
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **Internationalization**: [i18next](https://www.i18next.com) / [react-i18next](https://react.i18next.com)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction)

## 📂 Project Structure

- `app/`: Main application source code.
- `app/components/`: Reusable UI components.
- `app/app/`: Expo Router file-based navigation structure.
- `docs/`: Product and technical documentation.

## ✨ Key Features

- **Real-time Monitoring**: Continuous tracking of dam water levels and structural integrity.
- **Instant Notifications**: Automated alerts via SMS, Push, and Email for immediate response.
- **Geofencing**: Targeted alerts sent to residents within specific danger zones.
- **Multi-language Support**: Fully localized interface using i18next for diverse user bases.
- **Historical Data**: Access to past alerts and water level trends for analysis.
- **Offline Support**: Basic alert functionality cached for areas with poor connectivity.

## 🏗 Architecture

The system follows a modular architecture designed for high availability and scalability:

- **Frontend**: React Native Expo app utilizing Tailwind CSS for responsive and modern UI.
- **Backend API**: Node.js service handling data processing and alert distribution.
- **Database**: MongoDB/PostgreSQL (as configured in `api/`) for structured storage.
- **Security**: JWT-based authentication and role-based access control for administrators.

## 🛠 Current Development

**Branch**: `niduk2`

This branch is focused on:
- Implementation of the **Alerts & Updates** page.
- Visual improvements to the `AlertCard` component.
- Performance optimizations for mobile platforms.

### 📈 Progress Tracker
- [x] Project Initialization
- [x] Core Navigation Setup
- [x] Multi-language Integration
- [/] Alert Card UI Implementation (In Progress)
- [ ] Backend API Integration
- [ ] Push Notification Service Setup

## 📖 Getting Started

1. Navigate to the `app/` directory:
   ```bash
   cd app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npx expo start
   ```

## 🤝 Contributing

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Last Updated: February 2026*
*Dam Disaster Alert System - Protecting Communities through Technology*
