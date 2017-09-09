import * as nodemailer from "nodemailer";
import { Request, Response } from "express";

const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: process.env.SENDGRID_USER,
    pass: process.env.SENDGRID_PASSWORD
  }
});

/**
<<<<<<< 94f6e456dd12726c924e8ba87f53926a21c6078c
 * GET /contact
 * Contact form page.
 */
export let getContact = async (req: Request, res: Response) => {
  res.render("contact", {
    title: "Contact"
  });
};

/**
=======
>>>>>>> Remove views and public dir
 * POST /contact
 * Send a contact form via Nodemailer.
 */
export let postContact = async (req: Request, res: Response) => {
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
    res.status(200).json({message: "Email send"});
  });
};
