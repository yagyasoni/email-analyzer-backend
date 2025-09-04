const express = require('express');
const mongoose = require('mongoose');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// MongoDB Schema
const emailSchema = new mongoose.Schema({
  subject: String,
  receivingChain: [String],
  espType: String,
  createdAt: { type: Date, default: Date.now },
});
const Email = mongoose.model('Email', emailSchema);

// Root route
app.get('/', (req, res) => {
  res.send('Email Analyzer Backend is running');
});

// Generate unique subject
app.get('/email/generate-subject', (req, res) => {
  const timestamp = Date.now();
  const subject = `Test-${timestamp}`;
  console.log(`Generated subject: ${subject}`);
  res.json({ subject, email: process.env.EMAIL_ADDRESS || 'yagyasoni129@gmail.com' });
});

// Process email
app.post('/email/process', async (req, res) => {
  const { subject } = req.body;
  const searchSubject = subject || 'Test-';
  console.log(`Searching for emails with subject: ${searchSubject}`);

  const imapConfig = {
    user: process.env.IMAP_USER || 'yagyasoni129@gmail.com',
    password: process.env.IMAP_PASS || 'your-app-password',
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT) || 993,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
  };

  const imap = new Imap(imapConfig);

  imap.once('ready', () => {
    imap.openBox('[Gmail]/All Mail', false, (err, box) => {
      if (err) {
        console.error('IMAP openBox error:', err);
        return res.status(500).json({ error: err.message });
      }

      const searchCriteria = subject ? [['SUBJECT', subject]] : [['SUBJECT', 'Test-']];
      imap.search(searchCriteria, (err, results) => {
        if (err) {
          console.error('IMAP search error:', err);
          return res.status(500).json({ error: err.message });
        }
        if (!results || results.length === 0) {
          imap.search(['ALL'], (err, allResults) => {
            if (err) {
              console.error('IMAP all emails search error:', err);
              imap.end();
              return res.status(500).json({ error: err.message });
            }
            if (allResults.length === 0) {
              imap.end();
              return res.status(404).json({ error: 'No emails found in [Gmail]/All Mail' });
            }
            const fetch = imap.fetch(allResults, { bodies: ['HEADER.FIELDS (SUBJECT)'] });
            let subjects = [];
            fetch.on('message', (msg) => {
              msg.on('body', (stream) => {
                simpleParser(stream, (err, parsed) => {
                  if (err) console.error('simpleParser error:', err);
                  subjects.push(parsed.subject || 'No subject');
                });
              });
            });
            fetch.once('end', () => {
              console.log('Available email subjects:', subjects);
              imap.end();
              res.status(404).json({ error: `No emails found with subject "${searchSubject}"`, availableSubjects: subjects });
            });
          });
          return;
        }

        // Fetch the most recent matching email
        const fetch = imap.fetch(results[results.length - 1], { bodies: '' }); // Fetch full email
        fetch.on('message', (msg) => {
          msg.on('body', (stream, info) => {
            let rawEmail = '';
            stream.on('data', (chunk) => {
              rawEmail += chunk.toString('utf8');
            });
            stream.on('end', () => {
              simpleParser(rawEmail, async (err, parsed) => {
                if (err) {
                  console.error('simpleParser error:', err);
                  return res.status(500).json({ error: err.message });
                }

                console.log('Raw email:', rawEmail.slice(0, 500)); // Log first 500 chars
                console.log('Parsed headers:', parsed.headers);

                const receivingChain = parsed.headers.get('received') ? 
                  (Array.isArray(parsed.headers.get('received')) ? parsed.headers.get('received') : [parsed.headers.get('received')]) : 
                  ['unknown'];
                const espType = parsed.from?.value[0]?.address.includes('gmail') ? 'Gmail' : 
                                parsed.headers.get('received')?.some(h => h.toLowerCase().includes('google.com')) ? 'Gmail' : 
                                parsed.headers.get('x-mailer')?.toLowerCase().includes('gmail') ? 'Gmail' : 
                                parsed.headers.get('return-path')?.includes('google.com') ? 'Gmail' : 
                                'Unknown';

                const emailDoc = new Email({
                  subject: parsed.subject || 'No subject',
                  receivingChain,
                  espType,
                });
                await emailDoc.save();

                res.json({ receivingChain, espType });
                imap.end();
              });
            });
          });
        });

        fetch.once('error', (err) => {
          console.error('IMAP fetch error:', err);
          res.status(500).json({ error: err.message });
          imap.end();
        });
      });
    });
  });

  imap.once('error', (err) => {
    console.error('IMAP connection error:', err);
    res.status(500).json({ error: err.message });
  });

  imap.connect();
});

// Get latest processed email
app.get('/email/latest', async (req, res) => {
  try {
    const email = await Email.findOne().sort({ createdAt: -1 }).exec();
    if (!email) return res.status(404).json({ error: 'No processed emails found' });
    res.json({ receivingChain: email.receivingChain, espType: email.espType });
  } catch (err) {
    console.error('MongoDB error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));