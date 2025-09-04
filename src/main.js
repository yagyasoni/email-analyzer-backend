require("dotenv").config();
const { NestFactory } = require("@nestjs/core");
const { Router } = require("express");
const { AppModule } = require("./app.module");
const { EmailService } = require("./email/email.service");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const emailService = app.get("EmailService");
  const router = Router();

  router.get("/email/generate-subject", async (req, res) => {
    try {
      const subject = `Test-${Date.now()}`;
      await emailService.storeSubject(subject);
      res.json({ subject, email: process.env.EMAIL_ADDRESS });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/email/process", async (req, res) => {
    try {
      const result = await emailService.processEmail();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/email/latest", async (req, res) => {
    try {
      const result = await emailService.getLatestEmail();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.use(router);
  await app.listen(process.env.PORT || 3001);
  console.log(`Server running on http://localhost:${process.env.PORT || 3001}`);
}
bootstrap();
