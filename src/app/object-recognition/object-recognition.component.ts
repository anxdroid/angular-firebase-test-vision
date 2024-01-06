import { Component, ElementRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FileInputComponent } from 'ngx-material-file-input';
import { concatMap, first, fromEvent, takeUntil, tap } from 'rxjs';
import {
  LabelDetected,
  ObjectRecognitionFunctionService,
} from '../object-recognition-function.service';
import { ObjectDialogComponent } from './../object-dialog/object-dialog.component';
import { MedicalRecordsModel } from '../models/medical-records-model';
import { protos } from '@google-cloud/vision';

@Component({
  selector: 'app-object-recognition',
  templateUrl: './object-recognition.component.html',
  styleUrls: ['./object-recognition.component.scss'],
})
export class ObjectRecognitionComponent {
  @ViewChild('removableInput') removableInput!: FileInputComponent;
  @ViewChild("outputCanvas", { static: false }) outputCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild("inputImage", { static: false }) inputImage!: ElementRef<HTMLImageElement>;

  results: LabelDetected[] = [];
  fields: any = {'COD.FISC.': 'codFisc', 'Paziente' : 'paziente', 'Convenz.': 'convenzione'}
  medicalRecords = new Map<String, String>();
  image: string | null = null;


  cx: CanvasRenderingContext2D | null = null;

  constructor(
    private dialog: MatDialog,
    private objectRecognitionFunctionService: ObjectRecognitionFunctionService,
  ) {}

  initCanvas(){
    if (!this.image !== null) {
      console.log("canvas", this.outputCanvas.nativeElement);
      this.cx = this.outputCanvas.nativeElement.getContext("2d");
      this.outputCanvas.nativeElement.height = this.inputImage.nativeElement.height
      this.outputCanvas.nativeElement.width = this.inputImage.nativeElement.width
      this.outputCanvas.nativeElement.style.top = this.inputImage.nativeElement.offsetTop + "px";;
      this.outputCanvas.nativeElement.style.left = this.inputImage.nativeElement.offsetLeft + "px";
    }
  }

  /**
   * Handle file selection change
   * @param $event Event of change from DOM
   */
  onFileSelectionChange($event: Event) {
    const element = $event.target as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList) {
      const reader = new FileReader();
      reader.readAsDataURL(fileList[0]);
      reader.onload = () => {
        this.image = reader.result as string;
      };
    } else {
      this.image = null;
    }
  }

  /**
   * Cleanup file input and previous image selected
   *
   * @param $event Event of click from DOM
   */
  clearRemovableInput($event: Event) {
    if (this.removableInput) {
      this.removableInput.clear($event);
    }
    this.image = null;
    this.results = [];
  }

  /**
   * Start object recognizion, reading from uploaded {@link image}
   */
  recognizeObjects() {
    if (this.image !== null) {
      this.objectRecognitionFunctionService
        .recognizeObjectInImage(this.image)
        .pipe(first())
        .subscribe((results) => {
          this.results = results;
        });
    } else {
      this.dialog.open(ObjectDialogComponent, {
        width: '450px',
        enterAnimationDuration: '0ms',
        exitAnimationDuration: '500ms',
      });
    }
  }

  recognizeText() {
    if (this.image !== null) {
      this.initCanvas();
      this.objectRecognitionFunctionService
        .recognizeTextInImage(this.image)
        .pipe(first())
        .subscribe((results) => {
          console.log('recognizeText', results);
          if (this.cx !== null) {
            this.cx.clearRect(0, 0, this.outputCanvas.nativeElement.width, this.outputCanvas.nativeElement.height);
            let first: boolean = true;
            for (const result of results) {
                if (!first && result && result.boundingPoly && result.boundingPoly.vertices) {
                  const vertices = result.boundingPoly.vertices;
                  const topLeft = vertices[0]
                  const topRight = vertices[1]
                  const bottomLeft = vertices[3]
                  const bottomRight = vertices[2]
                  const width = (topRight.x ?? 0) - (topLeft.x ?? 0);
                  const height = (bottomLeft.y ?? 0) - (topLeft.y ?? 0);
                  console.log(width+"x"+height, vertices);
                  this.cx.beginPath();
                  this.cx.lineWidth = 2;
                  this.cx.fillStyle = "rgba(199, 87, 231, 0.2)";
                  this.cx.strokeStyle = "#c757e7";
                  this.cx.moveTo(topLeft.x ?? 0, topLeft.y ?? 0);
                  this.cx.lineTo(topRight.x ?? 0, topRight.y ?? 0);
                  this.cx.lineTo(bottomRight.x ?? 0, bottomRight.y ?? 0);
                  this.cx.lineTo(bottomLeft.x ?? 0, bottomLeft.y ?? 0);
                  this.cx.lineTo(topLeft.x ?? 0, topLeft.y ?? 0);

                  this.cx.lineTo(bottomRight.x ?? 0, bottomRight.y ?? 0);
                  this.cx.moveTo(topRight.x ?? 0, topRight.y ?? 0);
                  this.cx.lineTo(bottomLeft.x ?? 0, bottomLeft.y ?? 0);

                  this.cx.fill();
                  this.cx.stroke();
                }
                first = false;
              }
          }
          const regexp = /[\n|\r]?([^:]+:[^\n\r]*)/g;
          const matches = results[0].description.matchAll(regexp);
          this.medicalRecords.clear();
          for (const match of matches) {
            //console.log(match, match.index);

            let tokens = match[1].split(":");
            //console.log(match[1], tokens);

            const field = tokens[0].trim();
            if (this.fields.hasOwnProperty(field)) {
              const property = this.fields[field];
              //
              this.medicalRecords.set(property, tokens[1].trim());
            }
          }
          console.log(this.medicalRecords);
        });
    } else {
      this.dialog.open(ObjectDialogComponent, {
        width: '450px',
        enterAnimationDuration: '0ms',
        exitAnimationDuration: '500ms',
      });
    }
  }
}
