# event_ticket_BE

npm init -y 
src/index.ts
npx tsc --init npm i @types/node 
npm i -D typescript ts-node @types/node
npm i express dotenv pg pg-hstore sequelize sequelize-cli

initialize tsconfig 
npx tsc --init

to generate the tables on the db 
npx sequelize-cli model:generate --name UserModel --attributes firstName:string
then edit the model generated to ts file and add neccessary types
npx sequelize-cli db:migrate