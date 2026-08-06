import { Router } from 'express';
import * as challanController from '../controllers/challanController.js';
import {
  requireAuth,
  requireCompany,
  requirePage,
  requirePrivileged,
} from '../middleware/auth.js';

/**
 * One router serves both trades; it is mounted twice, at /api/embroidery and
 * /api/handwork, and the controller reads the trade off the mount path.
 */
export function createChallanRouter(page) {
  const router = Router();

  router.use(requireAuth, requireCompany, requirePage(page));

  // issue
  router.get('/issues', challanController.listIssues);
  router.get('/issues/search', challanController.searchIssues);
  router.get('/issues/next-no', challanController.nextIssueNo);
  router.get('/issues/:id/history', challanController.issueHistory);
  router.post('/issues', challanController.createIssue);
  router.put('/issues/:id', challanController.updateIssue);
  router.delete('/issues/bulk', requirePrivileged, challanController.removeIssues);
  router.delete('/issues/:id', requirePrivileged, challanController.removeIssue);

  // receive
  router.get('/receives', challanController.listReceives);
  router.get('/receives/next-no', challanController.nextReceiveNo);
  router.get('/receives/:id/history', challanController.receiveHistory);
  router.post('/receives', challanController.createReceive);
  router.put('/receives/:id', challanController.updateReceive);
  router.delete('/receives/bulk', requirePrivileged, challanController.removeReceives);
  router.delete('/receives/:id', requirePrivileged, challanController.removeReceive);

  return router;
}
