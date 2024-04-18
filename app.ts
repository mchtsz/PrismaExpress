import express from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { compileCss } from "./compileCss";
import path from "path";

const prisma = new PrismaClient();
const app = express();
const adminPaths = ["/admin/"];
const restrictedPaths = ["/welcome", ...adminPaths];

// Sass options for compiling css
const sassOptions = {
  src: path.join(__dirname, "styles"),
  dest: path.join(__dirname, "public"),
};

compileCss(sassOptions); // Compile css
app.use(cookieParser());

// Middleware to check if user is logged in, if not redirect to login page
app.use(async (req, res, next) => {
  // Exclude '/register' and '/' routes
  const path = req.path;

  if (!restrictedPaths.includes(path)) return next();

  const token = req.cookies.token;

  if (!token) return res.redirect("/");

  const user = await prisma.user.findFirst({
    where: {
      token: token,
    },
  });

  if (!user) return res.redirect("/");

  if (adminPaths.includes(path) && !user?.isAdmin) {
    return res.redirect("/welcome");
  }

  next();
});

// use these for parsing json and urlencoded data
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

// function to create an user
async function createUser() {
  const user = await prisma.user.create({
    data: {
      firstname: "test",
      lastname: "testing",
      mail: "mail@test.com",
      password: "passord01",
    },
  });

  console.log(user.firstname + "" + "has been created");

  return user;
}

// function to create an admin
async function createAdmin() {
  const admin = await prisma.user.create({
    data: {
      firstname: "admin",
      lastname: "admin",
      mail: "admin@test.com",
      password: crypto.createHash("sha256").update("admin").digest("hex"),
      isAdmin: true,
    },
  });

  console.log(`${admin.firstname} has been created`);

  return admin;
}

// post for login
app.post("/login", async (req, res) => {
  const { mail, password } = req.body;

  const userData = await prisma.user.findFirst({
    where: {
      mail: mail,
      password: crypto.createHash("sha256").update(password).digest("hex"),
    },
  });

  if (userData) {
    res.cookie("token", userData.token);
    res.redirect("/welcome");
  } else {
    res.redirect("/");
  }
});

// post for registering user
app.post("/register", async (req, res) => {
  const { firstname, lastname, mail, password } = req.body;

  const user = await prisma.user.create({
    data: {
      firstname: firstname,
      lastname: lastname,
      mail: mail,
      password: crypto.createHash("sha256").update(password).digest("hex"),
    },
  });

  res.redirect("/");
});

// page routes
const pageRoutes = {
  welcome: (req, res) => {
    res.sendFile(__dirname + "/public/welcome.html");
  },
  register: (req, res) => {
    res.sendFile(__dirname + "/public/register.html");
  },
  adminEdit: (req, res) => {
    res.sendFile(__dirname + "/public/admin/edit.html");
  },
  adminView: (req, res) => {
    res.sendFile(__dirname + "/public/admin/view.html");
  },
};

// api routes
const apiRoutes = {
  users: async (req, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
  },
};

// gets page routes
app.get("/welcome", pageRoutes.welcome);
app.get("/register", pageRoutes.register);
app.get("/admin/edit", pageRoutes.adminEdit);
app.get("/admin/view", pageRoutes.adminView);

// gets api routes
app.get("/api/users/", apiRoutes.users);

// start the server
app.listen(3000, () => {
  console.log(`Server running on port 3000`);
});