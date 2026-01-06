export { default as User } from "./User";
export type { IUser } from "./User";

export { default as Tenant } from "./Tenant";
export type { ITenant, IPublicBookingSettings } from "./Tenant";

export { default as Role } from "./Role";
export type { IRole, IPermission } from "./Role";

export { default as GSTConfig } from "./GSTConfig";
export type { IGSTConfig, IGSTRate } from "./GSTConfig";

export { default as TaxConfig } from "./TaxConfig";
export type { ITaxConfig, ITaxRate, ITaxCode } from "./TaxConfig";

export { default as Patient } from "./Patient";
export type { IPatient, IEmergencyContact } from "./Patient";

export { default as MedicalRecord } from "./MedicalRecord";
export type { IMedicalRecord, IVitalSigns } from "./MedicalRecord";

export { default as Prescription } from "./Prescription";
export type { IPrescription, IMedication } from "./Prescription";

export { default as Appointment } from "./Appointment";
export type { IAppointment } from "./Appointment";

export { default as Category } from "./Category";
export type { ICategory } from "./Category";

export { default as Supplier } from "./Supplier";
export type { ISupplier, ISupplierContact } from "./Supplier";

export { default as Product } from "./Product";
export type { IProduct, IProductBatch } from "./Product";

export { default as StockMovement } from "./StockMovement";
export type { IStockMovement } from "./StockMovement";

export { default as Invoice } from "./Invoice";
export type { IInvoice, IInvoiceItem } from "./Invoice";

export { default as Payment } from "./Payment";
export type { IPayment } from "./Payment";

export { default as DoctorSchedule } from "./DoctorSchedule";
export type { IDoctorSchedule, IDaySchedule, ITimeSlot, ILeaveDate } from "./DoctorSchedule";
