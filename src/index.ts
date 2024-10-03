import express from "express";
import cors from 'cors';
import bodyParser from "body-parser";
import sequelize from "./db/sequelize";
import userRouter from "./routes/user.route";
import eventRouter from "./routes/event.route";

const app = express();
const port = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use("/api/v1/user", userRouter);
app.use("/api/v1/event", eventRouter);

async function startApp() {
    try {
        await sequelize.authenticate();
        console.log("Connection has been established successfully.");

        await sequelize.sync().then(() => {
            app.listen(port, () => {
                console.log(`server is listening on http://localhost:${port}....`);
            });
        })
    } catch (error: any) {
        console.error(`Error starting server: ${error.message}`);
        process.exit(1);
    }
}

startApp();
