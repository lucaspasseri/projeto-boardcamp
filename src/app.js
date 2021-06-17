import express from 'express';
import cors from 'cors';
import pg from 'pg';

const app = express();

app.use(cors());
app.use(express.json());

const { Pool } = pg;

const connection = new Pool({
    user: 'bootcamp_role',
    password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp',
    host: 'localhost',
    port: 5432,
    database: 'boardcamp'
});

const games = [
    {
        id: 1,
        name: 'Banco Imobiliário',
        image: 'http://',
        stockTotal: 3,
        categoryId: 1,
        pricePerDay: 1500
    },
    {
        id: 2,
        name: 'Jogo da vida',
        image: 'http://',
        stockTotal: 2,
        categoryId: 1,
        pricePerDay: 1500,
    }
];

app.post("/games", async (req, res) => {
    const { name, image, stockTotal, categoryId, pricePerDay } = req.body;
    console.log(name, image, stockTotal, categoryId, pricePerDay);
    try {
        await connection.query('INSERT INTO games ( name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ( $1, $2, $3, $4, $5)',[name, image, stockTotal, categoryId, pricePerDay]);
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
})


app.get("/games", async (req, res) => {
    try {
        const games = await connection.query("SELECT * FROM games");
        res.send(games.rows);
    } catch {
        res.sendStatus(500);
    }
})

app.get("/", (req, res) => {
    res.send("Ok!");
})

app.get("/categories", async (req, res) => {

    try {
        const categories = await connection.query('SELECT * FROM categories');
        res.send(categories.rows);
    } catch {
        res.sendStatus(500);
    }
})

app.post("/categories", async (req, res) => {
    const { name }= req.body;
    try {
        const blankName = (name.trim().length === 0)
        if(blankName) {
            res.sendStatus(400);

        } else {
            const alreadyRegistred = 
               await connection.query('SELECT * FROM categories WHERE name = $1',[name]);

            if(alreadyRegistred.rows.length === 0){
                const newCategory = await connection.query('INSERT INTO categories (name) VALUES ($1)',[name]);
                res.sendStatus(201);

            } else {
                res.sendStatus(409);

            }
        }   

    } catch {
        res.sendStatus(500);
    }
})

app.listen(4000, () =>{
    console.log("Running on port 4000...");
});