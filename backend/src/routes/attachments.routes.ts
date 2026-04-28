import { Router, Request, Response } from 'express';
import multer from 'multer';
import { db } from '../lib/db.js';
import { attachments, receptionAttachments } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { uploadFile, deleteFile, getSignedFileUrl, extractKeyFromUrl } from '../lib/storage.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Type de fichier non autorisé'));
  },
});

// POST /api/attachments/upload
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });

  const { entityType, entityId } = req.body;
  if (!entityType || !entityId) return res.status(400).json({ error: 'entityType et entityId requis' });
  if (entityType !== 'receptionFacture') return res.status(400).json({ error: 'entityType invalide' });

  try {
    const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype, req.user!.tenantId);

    const attachment = db.insert(attachments)
      .values({ url: uploaded.url, filename: uploaded.filename, mimeType: uploaded.mimeType, size: uploaded.size, tenantId: req.user!.tenantId })
      .returning()
      .get();

    db.insert(receptionAttachments)
      .values({ receptionId: entityId, attachmentId: attachment.id, tenantId: req.user!.tenantId })
      .run();

    res.status(201).json(attachment);
  } catch (e: any) {
    console.error('Upload error:', e);
    res.status(500).json({ error: 'Erreur lors de l\'upload', details: e.message });
  }
});

// GET /api/attachments/receptionFacture/:entityId
router.get('/receptionFacture/:entityId', (req: Request, res: Response) => {
  try {
    const rows = db.query.receptionAttachments.findMany({
      where: eq(receptionAttachments.receptionId, req.params.entityId),
      with: { attachment: true },
    });
    res.json(
      rows
        .filter((r) => r.attachment?.tenantId === req.user!.tenantId)
        .map((r) => r.attachment)
    );
  } catch (e: any) {
    res.status(500).json({ error: 'Erreur lors de la récupération des pièces jointes' });
  }
});

// GET /api/attachments/:id/signed-url
router.get('/:id/signed-url', async (req: Request, res: Response) => {
  try {
    const attachment = db.query.attachments.findFirst({ where: eq(attachments.id, req.params.id) });
    if (!attachment) return res.status(404).json({ error: 'Pièce jointe introuvable' });
    if (attachment.tenantId !== req.user!.tenantId) return res.status(403).json({ error: 'Accès refusé' });

    const signedUrl = await getSignedFileUrl(extractKeyFromUrl(attachment.url), attachment.tenantId);
    res.json({ url: signedUrl });
  } catch (e: any) {
    res.status(500).json({ error: 'Erreur lors de la génération de l\'URL signée' });
  }
});

// DELETE /api/attachments/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const attachment = db.query.attachments.findFirst({ where: eq(attachments.id, req.params.id) });
    if (!attachment) return res.status(404).json({ error: 'Pièce jointe introuvable' });
    if (attachment.tenantId !== req.user!.tenantId) return res.status(403).json({ error: 'Accès refusé' });

    await deleteFile(extractKeyFromUrl(attachment.url), attachment.tenantId);
    db.delete(attachments).where(eq(attachments.id, req.params.id)).run();
    res.status(204).send();
  } catch (e: any) {
    console.error('Delete error:', e);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
});

export default router;
