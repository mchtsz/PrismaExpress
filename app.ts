import express from "express"
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { compileCss } from "./compileCss"
import path from "path"

const sassOptions = {
  src: path.join(__dirname, 'styles'),
  dest: path.join(__dirname, 'public')
};

compileCss(sassOptions);

const prisma = new PrismaClient();
const app = express();
const adminPaths = ["/admin/"];
const restrictedPaths = ["/welcome", ...adminPaths];

app.use(cookieParser());

app.use(async (req, res, next) => {
    // Exclude '/register' and '/' routes
    const path = req.path

    if (!restrictedPaths.includes(path)) return next();

    const token = req.cookies.token;

    if (!token) return res.redirect("/");

    const user = await prisma.user.findFirst({
        where: {
            token: token
        }
    })

    if (!user) return res.redirect("/")

    if (adminPaths.includes(path) && !user?.isAdmin) {
        return res.redirect("/welcome")
    }

    next()
})

app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

async function createUser() {
    const user = await prisma.user.create({
        data: {
        firstname: "test",
        lastname: "testing",
        mail: "mail@test.com",
        password: "passord01",
        }
    });

    console.log(user.firstname + "" + "has been created");

    return user;
}

async function createAdmin() {
    const admin = await prisma.user.create({
        data: {
        firstname: "admin",
        lastname: "admin",
        mail: "admin@test.com",
        password: crypto.createHash("sha256").update("admin").digest("hex"),
        isAdmin: true,
        }
    })

    console.log(`${admin.firstname} has been created`);

    return admin;
}

app.post("/login", async (req, res) => {
    const { mail, password } = req.body;

    const userData = await prisma.user.findFirst({
        where: {
            mail: mail,
            password: crypto.createHash("sha256").update(password).digest("hex")
        }
    });

    if(userData) {
        res.cookie("token", userData.token);
        res.redirect("/welcome");
    } else {
        res.redirect("/");
    }
})

app.post("/register", async (req, res) => {
    const { firstname, lastname, mail, password } = req.body;

    const user = await prisma.user.create({
        data: {
            firstname: firstname,
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

app.get("/admin/edit", async (req, res) => {
    res.sendFile(__dirname + "/public/admin/edit.html")
})

app.get("/admin/view", async (req, res) => {
    res.sendFile(__dirname + "/public/admin/view.html")
})

app.get("/api/users/", async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});

app.listen(3000, () => {
console.log(`Server running on port 3000`);
});