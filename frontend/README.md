# Smart Hospital Queue System — Frontend

React/Vite frontend for the Smart Hospital Queue System.

## Responsibilities

- Patient, doctor and administrator experiences
- Authentication/session restoration through the backend
- Appointment discovery and booking
- Queue/token visibility and real-time updates
- Doctor availability and profile management
- Patient medical-record access according to backend authorization
- Responsive dashboards, loading states, empty states and error handling

## Development

Create `frontend/.env` from `.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

Install and run:

```bash
npm ci
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

The frontend never treats local mock data as the source of operational hospital
state. Appointment, doctor, patient and queue information is retrieved from
the backend API and real-time Socket.IO events.
