import express from 'express';

const app = express();
app.use(express.json());

app.post('*', (req, res) => {
  console.log('--- RECEIVED WEBHOOK PAYLOAD ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('--------------------------------');
  res.status(200).json({ success: true });
});

app.listen(4500, () => {
  console.log('Mock CRM Webhook Server running on port 4500');
});
