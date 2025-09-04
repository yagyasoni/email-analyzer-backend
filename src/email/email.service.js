const Imap = require("imap");
const { simpleParser } = require("mailparser");

function EmailService(emailModel) {
  this.emailModel = emailModel;
  this.currentSubject = null;
}

EmailService.prototype.storeSubject = async function(subject) {
  this.currentSubject = subject;
};

EmailService.prototype.processEmail = async function() {
  if (!this.currentSubject) return { error: "No subject generated" };

  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASS,
      host: process.env.IMAP_HOST,
      port: parseInt(process.env.IMAP_PORT),
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err, box) => {
        if (err) return reject(err);
        imap.search([["UNSEEN"], ["HEADER", "SUBJECT", this.currentSubject]], (err, results) => {
          if (err) return reject(err);
          if (!results || !results.length) {
            imap.end();
            return resolve({ message: "No email found" });
          }

          const f = imap.fetch(results, { bodies: "HEADER.FIELDS (FROM TO SUBJECT DATE)", struct: true });
          f.on("message", (msg) => {
            msg.on("body", (stream) => {
              simpleParser(stream, async (err, parsed) => {
                if (err) return reject(err);

                const headers = parsed.headers;
                const rawHeaders = headers.toString();
                const receivingChain = this.extractReceivingChain(headers);
                const espType = this.detectESP(headers);

                const email = new this.emailModel({
                  subject: this.currentSubject,
                  rawHeaders,
                  receivingChain,
                  espType,
                });
                await email.save();

                imap.addFlags(results, "\\Seen", () => {});
                resolve({ receivingChain, espType });
              });
            });
          });

          f.once("end", () => imap.end());
        });
      });
    });

    imap.once("error", reject);
    imap.connect();
  });
};

EmailService.prototype.extractReceivingChain = function(headers) {
  const received = headers.get("received") || [];
  return Array.isArray(received) ? received.reverse() : [received];
};

EmailService.prototype.detectESP = function(headers) {
  const headersMap = {};
  headers.forEach((value, key) => {
    headersMap[key.toLowerCase()] = value;
  });

  if (headersMap["x-google-dkim-signature"]) return "Gmail";
  if (headersMap["x-ms-exchange-organization-authas"]) return "Outlook";
  if (headersMap["x-yahoo-newman-property"]) return "Yahoo";
  if (headersMap["x-sg-eid"]) return "SendGrid";
  if (headersMap["x-mc-user"]) return "Mailchimp";
  if (headersMap["feedback-id"] && headersMap["x-ses-outgoing"]) return "Amazon SES";
  if (headersMap["x-zoho-virus-scan"]) return "Zoho";

  const received = headers.get("received") || [];
  for (const rec of received) {
    if (rec.includes("google.com")) return "Gmail";
    if (rec.includes("outlook.com") || rec.includes("hotmail.com")) return "Outlook";
  }
  return "Unknown";
};

EmailService.prototype.getLatestEmail = async function() {
  const latest = await this.emailModel.findOne().sort({ timestamp: -1 });
  return latest ? { receivingChain: latest.receivingChain, espType: latest.espType } : null;
};

module.exports = { EmailService };
