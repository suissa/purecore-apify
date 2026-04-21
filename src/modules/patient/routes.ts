import { Router } from '../../router';
import { PatientController } from '../controllers/patient.controller';
import { PatientService } from '../services/patient.service';
import { PatientRepository } from '../database/repository';

// Instâncias dos serviços
const patientRepository = new PatientRepository();
const patientService = new PatientService(patientRepository);
const patientController = new PatientController(patientService);

// Criação do router
const router = new Router();

// Rotas CRUD
router.get('/', patientController.list.bind(patientController));
router.post('/', patientController.create.bind(patientController));
router.get('/:id', patientController.getById.bind(patientController));
router.put('/:id', patientController.update.bind(patientController));
router.delete('/:id', patientController.delete.bind(patientController));

export { router as patientRouter };
export default router;