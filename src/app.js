import express from 'express';
import cors from 'cors';
import pg from 'pg';
import Joi from 'joi';
import dayjs from 'dayjs';
import formatParser from 'dayjs/plugin/customParseFormat.js';
dayjs.extend(formatParser); 

pg.types.setTypeParser(1082, (str) => str);

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

app.post("/rentals", async (req, res) => {
    try {
        const {customerId, gameId, daysRented } = req.body;

        Joi.attempt(daysRented, Joi.number().integer().min(1).required());

        const validCustomer = await connection.query(`SELECT * FROM customers WHERE id = $1`, [customerId]);

        if(validCustomer.rows.length === 0){
            res.sendStatus(400);
            return;
        }

        const validGame = await connection.query(`SELECT * FROM games WHERE id = $1`, [gameId]);

        if(validGame.rows.length === 0){
            res.sendStatus(400);
            return;
        }

        const rentalsPerGameId = await connection.query(
            `SELECT games.*, rentals.* 
            FROM games JOIN rentals
            ON games.id = rentals."gameId"
            WHERE rentals."gameId" = $1
            `, [gameId]
        );

        if(rentalsPerGameId.rows.length >= validGame.rows[0].stockTotal){
            res.sendStatus(400);
            return;
        }

        await connection.query(
            `INSERT INTO rentals 
            ("customerId", "gameId", "rentDate", "daysRented", "originalPrice")
            VALUES ($1, $2, $3, $4, $5)`,
            [customerId, gameId, dayjs().format("YYYY-MM-DD"), daysRented, daysRented*validGame.rows[0].pricePerDay]
        );
        res.sendStatus(201);
    } catch {
        res.sendStatus(500);
    }
});

app.get("/rentals", async (req, res) => {
    try {
        const query = req.query;

        let rentalsCustomersGamesAndCategories;

        if(!query.customerId && !query.gameId){
            rentalsCustomersGamesAndCategories = await connection.query(
                `SELECT rentals.*,
                customers.phone, customers.cpf, customers.birthday, customers.name AS "customerName",
                games.image, games."stockTotal", games."categoryId", games."pricePerDay", games.name AS "gameName",
                categories.name AS "categoryName"  
                FROM rentals 
                JOIN customers ON rentals."customerId" = customers.id
                JOIN games ON rentals."gameId" = games.id
                JOIN categories ON games."categoryId" = categories.id`
            );
        }
        else if(!query.customerId){
            rentalsCustomersGamesAndCategories = await connection.query(
                `SELECT rentals.*,
                customers.phone, customers.cpf, customers.birthday, customers.name AS "customerName",
                games.image, games."stockTotal", games."categoryId", games."pricePerDay", games.name AS "gameName",
                categories.name AS "categoryName"  
                FROM rentals 
                JOIN customers ON rentals."customerId" = customers.id
                JOIN games ON rentals."gameId" = games.id
                JOIN categories ON games."categoryId" = categories.id
                WHERE rentals."gameId" = $1`, [query.gameId]
            );
        }
        else if(!query.gameId){
            rentalsCustomersGamesAndCategories = await connection.query(
                `SELECT rentals.*,
                customers.phone, customers.cpf, customers.birthday, customers.name AS "customerName",
                games.image, games."stockTotal", games."categoryId", games."pricePerDay", games.name AS "gameName",
                categories.name AS "categoryName"  
                FROM rentals 
                JOIN customers ON rentals."customerId" = customers.id
                JOIN games ON rentals."gameId" = games.id
                JOIN categories ON games."categoryId" = categories.id
                WHERE rentals."customerId" = $1`, [query.customerId]
            );
        }
        else {
            console.log("aqui");
            rentalsCustomersGamesAndCategories = await connection.query(
                `SELECT rentals.*,
                customers.phone, customers.cpf, customers.birthday, customers.name AS "customerName",
                games.image, games."stockTotal", games."categoryId", games."pricePerDay", games.name AS "gameName",
                categories.name AS "categoryName"  
                FROM rentals 
                JOIN customers ON rentals."customerId" = customers.id
                JOIN games ON rentals."gameId" = games.id
                JOIN categories ON games."categoryId" = categories.id
                WHERE rentals."customerId" = $1
                AND rentals."gameId" = $2`, [query.customerId, query.gameId]
            );
        }
        

        const output = rentalsCustomersGamesAndCategories.rows.map(item =>{
            return {
                id: item.id,
                customerId: item.customerId,
                gameId: item.gameId,
                rentDate: item.rentDate,
                daysRented: item.daysRented,
                returnDate: item.returnDate,
                originalPrice: item.originalPrice,
                delayFee: item.delayFee,
                customer: {
                    id: item.customerId,
                    name: item.customerName
                },
                game: {
                    id: item.gameId,
                    name: item.gameName,
                    categoryId: item.categoryId,
                    categoryName: item.categoryName
                }
            };
        });
        res.send(output);
    } catch {
        res.sendStatus(500);
    }
});

app.put("/customers/:id", async (req, res) => {
    try{
        const customerId = req.params;
        const {name, phone, cpf, birthday} = req.body;

        Joi.attempt(name, Joi.string().min(1).required());
        Joi.attempt(phone, Joi.string().pattern(/^[0-9]{10,11}$/).required());
        Joi.attempt(cpf, Joi.string().pattern(/^[0-9]{11}$/).required());

        if(!dayjs(birthday, 'YYYY-MM-DD', true).isValid()){
            res.sendStatus(400);
            return;
        }

        const cpfAlreadyRegistred = await connection.query(
            `SELECT * FROM customers WHERE cpf = $1 AND id <> $2`,
            [cpf, customerId.id]
        );

        if(cpfAlreadyRegistred.rows.length !== 0){
            res.sendStatus(409);
            return;
        }
        await connection.query(
            `UPDATE customers
            SET name = $1, phone = $2, cpf = $3, birthday = $4
            WHERE id = $5`,
            [name, phone, cpf, birthday, customerId.id]
        );
        res.sendStatus(200);
        
    } catch(e) {
        if(e.details[0].type === "string.empty" || 
            e.details[0].type === "string.base" ||
            e.details[0].type === "any.required"||
            e.details[0].type === "number.min"  ||
            e.details[0].type === "number.base" ||
            e.details[0].type === 'string.pattern.base'     
        ){ 
            res.sendStatus(400);
        } else {
            res.sendStatus(500);
        }
    }
});

app.post("/customers", async (req, res) => {
    try{
        const {name, phone, cpf, birthday} = req.body;

        Joi.attempt(name, Joi.string().min(1).required());
        Joi.attempt(phone, Joi.string().pattern(/^[0-9]{10,11}$/).required());
        Joi.attempt(cpf, Joi.string().pattern(/^[0-9]{11}$/).required());

        if(!dayjs(birthday, 'YYYY-MM-DD', true).isValid()){
            res.sendStatus(400);
            return;
        }

        const cpfAlreadyRegistred = await connection.query(`SELECT cpf FROM customers WHERE cpf = $1`, [cpf]);

        if(cpfAlreadyRegistred.rows.length !== 0){
            res.sendStatus(409);
            return;
        }

        const newCustomer = await connection.query(`INSERT INTO customers
            (name, phone, cpf, birthday) VALUES ($1, $2, $3, $4)`, [name, phone, cpf, birthday]);
            res.sendStatus(201);
        
    } catch(e) {
        if(e.details[0].type === "string.empty" || 
            e.details[0].type === "string.base" ||
            e.details[0].type === "any.required"||
            e.details[0].type === "number.min"  ||
            e.details[0].type === "number.base" ||
            e.details[0].type === 'string.pattern.base'     
        ){ 
            res.sendStatus(400);
        } else {
            res.sendStatus(500);
        }
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
        
    } catch {    
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

    } catch{
        res.sendStatus(500);
    }
});

app.post("/games", async (req, res) => {
    try {
        const { name, image, stockTotal, categoryId, pricePerDay } = req.body;

        Joi.attempt(name, Joi.string().min(1).required());
        Joi.attempt(stockTotal, Joi.number().integer().min(1).required());
        Joi.attempt(pricePerDay, Joi.number().integer().min(1).required());

        var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
            '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
            '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
            '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
            '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
            '(\\#[-a-z\\d_]*)?$','i'
        );

        Joi.attempt(image, Joi.string().pattern(pattern));

        const existingCategoryId = await connection.query('SELECT id FROM categories WHERE id = $1',[categoryId]);
        const nameAlreadyRegistred = await connection.query('SELECT name FROM games WHERE name = $1',[name]);

        if(existingCategoryId.rows.length === 0){
            res.sendStatus(400);
        }

        if(nameAlreadyRegistred.rows.length !== 0){
            res.sendStatus(409);

        } else {
            await connection.query(
                'INSERT INTO games ( name, image, "stockTotal", "categoryId", "pricePerDay") VALUES ( $1, $2, $3, $4, $5)',
                [name, image, stockTotal, categoryId, pricePerDay]
            );
            res.sendStatus(201);
        }
        
    } catch(e) {
        if(e.details[0].type === "string.empty" || 
            e.details[0].type === "string.base" ||
            e.details[0].type === "any.required"||
            e.details[0].type === "number.min"  ||
            e.details[0].type === "number.base" ||
            e.details[0].type === 'string.pattern.base'     
        ){ 
            res.sendStatus(400);
        } else {
            res.sendStatus(500);
        }

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
                WHERE UPPER(games.name) LIKE UPPER($1)`, [`${queryName+'%'}`]
            );
            res.send(games.rows);

        }

    } catch {    
        res.sendStatus(500);
    }
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
    try {
        const { name } = req.body;

        Joi.attempt(name, Joi.string().min(1).required());
    
        const alreadyRegistred = 
            await connection.query('SELECT * FROM categories WHERE name = $1',[name]);

        if(alreadyRegistred.rows.length === 0){
            const newCategory = await connection.query('INSERT INTO categories (name) VALUES ($1)',[name]);
            res.sendStatus(201);

        } else {
            res.sendStatus(409);

        }   
    } catch(e) {
        if(e.details[0].type === "string.empty" || 
            e.details[0].type === "string.base" ||
            e.details[0].type === "any.required"        
        ){ 
            res.sendStatus(400);
        } else {
            res.sendStatus(500);
        }
        
    }
});

app.listen(4000);