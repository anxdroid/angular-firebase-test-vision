export class MedicalRecordsModel {

  //Fields
  codFisc?: any
  paziente?: any
  convenzione?: any

  constructor (codFisc: String, paziente: String, convenzione: String){
     this.codFisc = codFisc
     this.paziente = paziente
     this.convenzione = convenzione
  }}
