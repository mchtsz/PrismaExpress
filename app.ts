import express from "express"
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import cookieParser from "cookie-parser";

const prisma = new PrismaClient();
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/welcome", async (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        res.redirect("/");
    } else {
        const user = await prisma.user.findFirst({
            where: {
                token: token
            }
        })

        if (user) {
            next();
        } else {
            res.redirect("/");
        }
    }
})

async function createUser() {
    const user = await prisma.user.create({
        data: {
        surname: "test",
        lastname: "testing",
        mail: "mail@test.com",
        password: "passord01",
        }
    });

    console.log(user.surname + "" + "has been created");

    return user;
}

app.post("/login", async (req, res) => {
    const { mail, password } = req.body;

    const userData = await prisma.user.findFirst({
        where: {
            mail: mail,
            password: crypto.createHash("sha256").update(password).digest("hex")
        }
    });

    if (userData) {
        res.cookie("token", userData.token);
        res.redirect("/welcome");
    } else {
        res.redirect("/");
    }
})

app.post("/register", async (req, res) => {
    const { surname, lastname, mail, password } = req.body;

    const user = await prisma.user.create({
        data: {
            surname: surname,
            lastname: lastname,
            mail: mail,
            password: crypto.createHash("sha256").update(password).digest("hex")
        }
    });

    res.redirect("/")
})

app.get("/welcome", async (req, res) => {
    res.sendFile(__dirname + "/public/welcome.html") 
})

app.get("/register", async (req, res) => {
    res.sendFile(__dirname + "/public/register.html")
})


app.listen(3000, () => {
console.log(`Server running on port 3000`);
});