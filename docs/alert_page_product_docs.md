# 🚨 Alert Page Documentation

## 📌 Overview & Purpose
The **Alert Page** is the core feature of the Dam Disaster Alert System. It serves as the primary interface for users to receive critical safety information regarding dam water levels and potential flood risks.

**Primary Goal:** To deliver actionable, real-time safety warnings to users based on their geolocation.

---

## 📱 User Interface (UI) Breakdown

### Visual Hierarchy
*   **Sticky Header**: Contains the title "Alert & Updates" and essential settings, ensuring context is maintained.
*   **Severity Coding**: Alerts are visually distinct based on urgency:
    *   🔴 **Critical (Red)**: Immediate Action Required.
    *   🟠 **Warning (Orange)**: High Alert / Be Prepared.
    *   🟡 **Watch (Yellow)**: Monitoring / Traffic / Minor.
*   **View Toggle**: Users can switch between a **List View** (chronological feed) and a **Live Map View** (spatial context).

---

## ⚡ Functional Requirements

### Real-time Updates
*   **Mechanism**: The app uses **WebSockets** for immediate, low-latency updates during active threats.
*   **Fallback**: Switches to a 60-second polling interval if the connection is unstable or in low-power mode.

### Push Notifications
*   **Background State**: Tapping a notification opens the app and deep-links directly to the specific `AlertDetail` view.
*   **Priority**: Critical alerts override silent mode (subject to OS permissions).

### Geolocation
*   **Filtering**: Alerts are sorted by distance from the user's device coordinates.
*   **Radius**: Users only receive push notifications for dams within a configurable safety radius (default: 20km).

---

## 🛠 Technical Implementation (Frontend)

### 📦 Components
*   `screens/AlertScreen.tsx`: Main container that handles layout and view switching.
*   `components/AlertCard.tsx`: Reusable component displaying title, timestamp, location, and severity color.
*   `components/SeverityBadge.tsx`: Visual indicator of the risk level (Icon + Label).

### 🔄 State Management
*   **TanStack Query**: Used for fetching, caching, and updating server state.
*   **RefreshControl**: Standard pull-to-refresh gesture enabled on the list view.

### 🔗 API Integration
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/alerts` | Fetches a list of active alerts based on user location. |
| `GET` | `/api/v1/alerts/:id` | Fetches detailed info, including evacuation routes. |

---

## ⚠️ Edge Cases & Error Handling

*   **API Failure**: App gracefully degrades to show cached data from the last successful fetch. A "Sync Error" banner is displayed non-intrusively.
*   **User Offline**:
    *   Specific "Offline Mode" UI indicating live updates are paused.
    *   Users can view previously loaded alerts.
*   **GPS Disabled**:
    *   App prompts for location permissions.
    *   Fallback: Shows alerts for the user's registered home region or a default "All Zones" list.

---

## ✅ Testing Checklist

*   [ ] **Connectivity Loss**: Verify "Offline Mode" triggers and cached content remains visible.
*   [ ] **Notification Tap**: Ensure app opens from quit state directly to the correct Alert ID.
*   [ ] **Zero Alerts**: Verify the "All Clear" empty state renders correctly.
*   [ ] **Map/List Toggle**: Ensure state is preserved when switching views.
*   [ ] **Font Scaling**: Test text readability at 200% dynamic type settings.
*   [ ] **Location Permission Denied**: Verify expected fallback behavior (e.g., manual location or default list).

---

## 🔮 Future Improvements

*   [ ] **"Mark as Safe" Button**: Allow users in affected areas to quickly notify trusted contacts.
*   [ ] **SMS Fallback**: Integrate SMS delivery for critical warnings when data connectivity is poor.
