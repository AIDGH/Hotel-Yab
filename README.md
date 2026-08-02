# Hotel-Yab
Hotel-Yab is a hotel discovery platform designed to help users find hotels and explore verified information about celebrities, influencers, actors, artists, and other notable people associated with each hotel.

Project Status

The project is currently in the initial development phase.

The first development milestone is to build the backend API, database structure, user authentication, and the core hotel data model.

Planned Technology Stack

Web Application

* Next.js
* React
* TypeScript

Backend

* Node.js
* NestJS
* TypeScript

Database

* PostgreSQL
* Prisma ORM

Future Mobile Application

* React Native
* Expo
* TypeScript

Initial MVP Features

The first usable version of Hotel-Yab is planned to include:

* User registration and authentication
* Hotel listing
* Hotel detail pages
* City-based hotel search
* Celebrity and influencer profiles
* Connections between hotels and notable people
* Source and verification status for each connection
* User favorites
* Basic administration panel

Architecture

The project will initially use a modular monolith architecture.

The web application, future mobile application, and administration panel will communicate with a centralized backend API.

Next.js Web App ───────┐
                       ├── NestJS API ── PostgreSQL
React Native App ──────┘

Repository Structure

The planned repository structure is:

Hotel-Yab/  
├── apps/  
│   ├── api/  
│   ├── web/  
│   └── mobile/  
├── packages/  
├── README.md  
└── .gitignore  

The mobile application will be added in a future phase.

Development Approach

Development will proceed incrementally.

Each major step should:

1. Have a clear purpose.
2. Be explained before implementation.
3. Be tested locally.
4. Be committed separately.
5. Keep the main branch in a working state.

Current Phase

The current phase is repository initialization and backend setup.
