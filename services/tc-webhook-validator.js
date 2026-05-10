import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { createTCStatusEngine } from '../services/tc-status-engine.js';
import { createTCPortalService } from '../services/tc-portal-service.js';
import { createTCReportService } from '../services/tc-report-service.js';
import { createTCAutomationService } from '../services/tc-automation-service.js';
import { createTCApprovalService } from '../services/tc-approval-service.js';
import { createTCAlertService } from '../services/tc-alert-service.js';
import { createTCAsanaSyncService } from '../services/tc-asana-sync