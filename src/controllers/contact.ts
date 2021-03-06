import * as nodemailer from "nodemailer";
import { Request, Response } from "express";
import { asyncMiddleware } from "../common/common";

const transporter = nodemailer.createTransport({
    service: "SendGrid",
    auth: {
        user: process.env.SENDGRID_USER,
        pass: process.env.SENDGRID_PASSWORD
    }
});

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 */
export let postContact = asyncMiddleware(async (req: Request, res: Response) => {
    req.assert("name", "Name cannot be blank").notEmpty();
    req.assert("email", "Email is not valid").isEmail();
    req.assert("message", "Message cannot be blank").notEmpty();

    const errors = req.validationErrors();

    if (errors) {
        return res.status(400).json(errors);
    }

    const mailOptions = {
        to: "your@email.com",
        from: `${req.body.name} <${req.body.email}>`,
        subject: "Contact Form",
        text: req.body.message
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            return res.status(500).json(err);
        }
        res.status(200).json({ message: "Email send" });
    });
});
