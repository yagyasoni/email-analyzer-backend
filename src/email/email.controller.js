const { Router } = require("express");

function EmailController(emailService) {
  this.emailService = emailService;
  this.router = Router();
  this.setupRoutes();
}

EmailController.prototype.setupRoutes = function() {
  this.router.get("/generate-subject", async (req, res) => {
    try {
      const subject = `Test-${Date.now()}`;
      await this.emailService.storeSubject(subject);
      res.json({ subject, email: process.env.EMAIL_ADDRESS });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  this.router.post("/process", async (req, res) => {
    try {
      const result = await this.emailService.processEmail();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  this.router.get("/latest", async (req, res) => {
    try {
      const result = await this.emailService.getLatestEmail();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
};

EmailController.prototype.getRouter = function() {
  return this.router;
};

module.exports = { EmailController };
