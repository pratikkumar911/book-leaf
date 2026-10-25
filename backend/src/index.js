import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import bookRoutes from './routes/books.js';
import ticketRoutes from './routes/tickets.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: config.frontendOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(config.port, () => console.log(`[server] on :${config.port}`));