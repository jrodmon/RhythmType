typebeat/
│── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components (GameArea, Scoreboard, etc.)
│   │   ├── hooks/         # custom hooks (useAudioSync, useSocket)
│   │   ├── pages/         # page routes
│   │   ├── styles/        # Tailwind configs
│   │   └── App.js
│   └── package.json
│
│── server/                # Backend API + Socket.IO
│   ├── index.js           # Express + Socket.IO entry point
│   ├── routes/            # REST routes (scores, users)
│   ├── db/                # Database connection (Postgres + Prisma/pg)
│   └── package.json
│
│── docker-compose.yml     # Define containers (frontend, backend, postgres)
│── README.md
