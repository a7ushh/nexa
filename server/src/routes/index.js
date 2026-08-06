import { Router } from 'express';
import authRouter from './auth.js';
import companiesRouter from './companies.js';
import mastersRouter from './masters.js';
import greyRouter from './grey.js';
import reportsRouter from './reports.js';
import suggestionsRouter from './suggestions.js';
import usersRouter from './users.js';
import challanDocsRouter from './challanDocs.js';
import { createChallanRouter } from './challans.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/companies', companiesRouter);
router.use('/masters', mastersRouter);
router.use('/grey', greyRouter);

// One challan router, mounted per trade; the controller reads the trade off the
// mount path so embroidery and handwork share a single implementation.
router.use('/embroidery', createChallanRouter('embroidery'));
router.use('/handwork', createChallanRouter('handwork'));

router.use('/reports', reportsRouter);
router.use('/suggestions', suggestionsRouter);
router.use('/challans', challanDocsRouter);
router.use('/', usersRouter);

export default router;
