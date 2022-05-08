const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

function verityJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded
        next()
    })

}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fqnve.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect()
        const stockCollection = client.db('bookStock').collection('myStock')

        // JWT token generator
        app.post('/login', async (req, res) => {
            const user = req.body
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1d'
            })
            res.send({ accessToken })
        })

        // Getting All Items with pagination
        app.get('/stock', async (req, res) => {
            const query = {}
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)
            const cursor = stockCollection.find(query)
            let stock;
            if (page || size) {
                stock = await cursor.skip(page * size).limit(size).toArray()
            }
            else {
                stock = await cursor.toArray()
            }

            res.send(stock)
        })

        // Getting stock count for pagination
        app.get('/stockcount', async (req, res) => {
            const count = await stockCollection.estimatedDocumentCount()
            res.send({ count })
        })

        // Getting Individual Item
        app.get('/stock/:_id', async (req, res) => {
            const _id = req.params._id
            const query = { _id: ObjectId(_id) }
            const stock = await stockCollection.findOne(query)
            res.send(stock)
        })

        // Adding Item
        app.post('/stock', async (req, res) => {
            const newItem = req.body
            const result = await stockCollection.insertOne(newItem)
            res.send(result)
        })

        // Delete Item
        app.delete('/stock/:id', async (req, res) => {
            const _id = req.params.id;
            const query = { _id: ObjectId(_id) }
            const result = await stockCollection.deleteOne(query)
            res.send(result)
        })

        // Getting User's added inventories item
        app.get('/myitems', verityJWT, async (req, res) => {
            const decodedEmail = req.decoded.email
            const email = req.query.email
            if (email === decodedEmail) {
                const query = { email: email }
                const cursor = stockCollection.find(query)
                const myItems = await cursor.toArray()
                res.send(myItems)
            }
            else {
                res.status(403).send({ message: 'Forbidden Access' })
            }
        })

        // Updating stock quantity
        app.put('/stock/:_id', async (req, res) => {
            const _id = req.params._id
            const filter = { _id: ObjectId(_id) }
            const newQuantity = req.body.quantity
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    quantity: parseInt(newQuantity)
                }
            }

            const result = await stockCollection.updateOne(filter, updatedDoc, options)
            res.send(result)

        })


    }
    finally {

    }

}

run().catch(console.dir)


// Root
app.get('/', (req, res) => {
    res.send('BookStock server is running')
})

app.listen(port, () => {
    console.log('Listening to ', port)
})