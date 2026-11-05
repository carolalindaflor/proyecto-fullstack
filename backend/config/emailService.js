const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
    }
});

const enviarEmail = async ({ para, assunto, mensagem }) => {
    return transporter.sendMail({
        from: `"Voke Brasil" <${process.env.EMAIL_USER}>`,
        to: para,
        subject: assunto,
        html: mensagem
    });
};

module.exports = { enviarEmail };