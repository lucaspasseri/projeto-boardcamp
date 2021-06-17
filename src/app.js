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

app.post("/customers", async (req, res) => {
    try{
        const {name, phone, cpf, birthday} = req.body;
        const newCustomer = await connection.query(`INSERT INTO customers
            (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)`, [name, phone, cpf, birthday]);
            res.sendStatus(201);
    } catch(e) {
        console.log(e);
        res.sendStatus(500);
    }
});

app.get("/customers/:id", async (req, res) => {    
    try {
        const customerId = req.params;    

        const customer = await connection.query(
                `SELECT * FROM customers
                WHERE id = $1`, [customerId.id]
        );
        if(customer.rows.length === 0){
            res.sendStatus(404);
        } else {
            res.send(customer.rows[0]);
        }
        
    } catch(e) {    
        console.log(e);
        res.sendStatus(500);
    }
});

app.get("/customers", async (req, res) => {    
    try {
        const queryCPF = req.query.cpf; 

        if(!queryCPF){
            const customers = await connection.query(`SELECT * FROM customers`);
            res.send(customers.rows);

        } else {
            const customers = await connection.query(
                `SELECT * FROM customers
                WHERE customers.cpf LIKE $1`, [`${queryCPF+'%'}`]
            );
            res.send(customers.rows);
        }

    } catch(e) {    
        console.log(e);
        res.sendStatus(500);
    }
});

app.post("/games", async (req, res) => {
    const { name, image, stockTotal, categoryId, pricePerDay } = req.body;

    try {
        
        const existingCategoryId = await connection.query('SELECT id FROM categories WHERE id = $1',[categoryId]);
        const nameAlreadyRegistred = await connection.query('SELECT name FROM games WHERE name = $1',[name]);

        const validName = (name.trim().length > 0);
        const validStockTotal = (stockTotal > 0);
        const validPricePerDay = (pricePerDay > 0);

        if(existingCategoryId.rows.length === 0 || !validName || !validStockTotal || !validPricePerDay){ 
            res.sendStatus(400);

        } else {
            if(nameAlreadyRegistred.rows.length > 0){
                res.sendStatus(409);

            } else {
                await connection.query(
                    'INSERT INTO games ( name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ( $1, $2, $3, $4, $5)',
                    [name, image, stockTotal, categoryId, pricePerDay]
                );
                res.sendStatus(201);

            }
        }
    } catch {
        res.sendStatus(500);

    }
});

app.get("/games", async (req, res) => {    
    try {
        const queryName = req.query.name;    

        if(!queryName){
            const games = await connection.query(
                `SELECT games.*, categories.name AS "categoryName"
                FROM games JOIN categories
                ON games."categoryId" = categories.id
            `);
            res.send(games.rows);

        } else {
            const games = await connection.query(
                `SELECT games.*, categories.name AS "categoryName"
                FROM games JOIN categories
                ON games."categoryId" = categories.id
                WHERE games.name LIKE $1`, [`${queryName+'%'}`]
            );
            res.send(games.rows);

        }

    } catch(e) {    
        console.log(e);
        res.sendStatus(500);
    }
});

app.get("/", (req, res) => {
    res.send("Ok!");
});

app.get("/categories", async (req, res) => {

    try {
        const categories = await connection.query('SELECT * FROM categories');
        res.send(categories.rows);
    } catch {
        res.sendStatus(500);
    }
});

app.post("/categories", async (req, res) => {
    const { name }= req.body;
    try {
        const validName = (name.trim().length > 0)
        if(!validName) {
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
});

app.listen(4000, () =>{
    console.log("Running on port 4000...");
});