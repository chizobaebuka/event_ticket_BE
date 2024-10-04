# Event Ticket Booking System

## Description
The Event Ticket Booking System is a Node.js application that provides a RESTful API for managing event ticket bookings. It allows users to initialize events with a set number of tickets, book tickets, manage a waiting list, and handle ticket cancellations. This project is designed to showcase proficiency in asynchronous programming, API design, and Test-Driven Development (TDD) practices.

## Table of Contents
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup Instructions](#setup-instructions)
- [API Endpoints](#api-endpoints)
- [Implementation Details](#implementation-details)
- [Evaluation Criteria](#evaluation-criteria)
- [Submission Guidelines](#submission-guidelines)
- [Bonus Points](#bonus-points)

## Features
- Initialize an event with a specified number of available tickets.
- Book multiple tickets concurrently for users.
- Automatically manage a waiting list when tickets are sold out.
- Retrieve the current status of events, including available tickets and waiting list count.
- Cancel bookings and assign available tickets to users on the waiting list.
- Error handling for various scenarios with meaningful API responses.
- Implemented using Test-Driven Development (TDD) principles to ensure reliability and maintainability.

## Technologies Used
- **Node.js**: Server-side JavaScript runtime.
- **Express.js**: Web framework for building APIs.
- **Sequelize**: ORM for interacting with PostgreSQL databases.
- **PostgreSQL**: Relational database management system (RDBMS).
- **TypeScript**: Superset of JavaScript for static typing and modern features.
- **Jest**: Testing framework for unit and integration tests.
- **dotenv**: For managing environment variables.

## Setup Instructions
1. **Initialize the Project**:
   ```bash
   npm init -y
2. **Setup Typescript**:
    npx tsc --init
    npm i -D typescript ts-node @types/node
3  **Install Dependencies**
    npm install @types/pg bcryptjs body-parser cors dotenv express jsonwebtoken nodemon pg pg-hstore sequelize sequelize-cli zod
4 **Install DevDependencies** 
    npm install --save-dev @types/bcryptjs @types/cors @types/express @types/jsonwebtoken @types/node @types/uuid ts-node typescript
5  **Generating Database Tables**
    npx sequelize-cli model:generate --name UserModel --attributes firstName:string
    Then Edit the generated model to TypeScript files and add necessary types.
6. **Run Migrations To Create Table in DB**
    npx sequelize-cli db:migrate
7  **Undo All Migrations**
    npx sequelize-cli db:migrate:undo:all


### CLONE AND CONFIGURE
1. Clone the repo
2. Run npm i 
3. Set up your env taking a look at the .env.sample
4. Run npm run dev
5. Start testing your apis 
6. Base URL for events on local http://localhost:${port}/api/v1/event
6. Base URL for user on local http://localhost:${port}/api/v1/user
