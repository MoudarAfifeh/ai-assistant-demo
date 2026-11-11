import express from 'express';
import dotenv from 'dotenv';
import router from './routes';

dotenv.config();

const app = express();
app.use(express.json());
app.use(router);

// On Vercel the exported app is served as a function; locally we listen.
if (!process.env.VERCEL) {
   const port = process.env.PORT || 3000;
   app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
   });
}

export default app;
