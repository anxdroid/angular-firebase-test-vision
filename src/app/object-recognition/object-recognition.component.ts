import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { FileInputComponent } from 'ngx-material-file-input';
import { Observable, Subject, concatMap, first, fromEvent, takeUntil, tap } from 'rxjs';
import {
  LabelDetected,
  ObjectRecognitionFunctionService,
} from '../object-recognition-function.service';
import { ObjectDialogComponent } from './../object-dialog/object-dialog.component';
import { MedicalRecordsModel } from '../models/medical-records-model';
import { protos } from '@google-cloud/vision';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';

@Component({
  selector: 'app-object-recognition',
  templateUrl: './object-recognition.component.html',
  styleUrls: ['./object-recognition.component.scss'],
})
export class ObjectRecognitionComponent {
  @ViewChild('removableInput') removableInput!: FileInputComponent;
  @ViewChild("outputCanvas", { static: false }) outputCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild("inputImage", { static: false }) inputImage!: ElementRef<HTMLImageElement>;
  @Output()
  public pictureTaken = new EventEmitter<WebcamImage>();

  // toggle webcam on/off
  public showWebcam = true;
  public allowCameraSwitch = true;
  public multipleWebcamsAvailable = false;
  public deviceId: string = "";
  public videoOptions: MediaTrackConstraints = {
    // width: {ideal: 1024},
    // height: {ideal: 576}
  };
  public errors: WebcamInitError[] = [];

  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  // switch to next / previous / specific webcam; true/false: forward/backwards, string: deviceId
  private nextWebcam: Subject<boolean|string> = new Subject<boolean|string>();
  results: LabelDetected[] = [];
  fields: any = {'COD.FISC.': 'codFisc', 'Paziente' : 'paziente', 'Convenz.': 'convenzione'}
  medicalRecords = new Map<String, String>();
  image: string | null = null;


  cx: CanvasRenderingContext2D | null = null;

  constructor(
    private dialog: MatDialog,
    private objectRecognitionFunctionService: ObjectRecognitionFunctionService,
  ) {}

  public ngOnInit(): void {
    WebcamUtil.getAvailableVideoInputs()
      .then((mediaDevices: MediaDeviceInfo[]) => {
        this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
      });
  }

  public triggerSnapshot(): void {
    this.trigger.next();
  }

  public toggleWebcam(): void {
    this.showWebcam = !this.showWebcam;
  }

  public handleInitError(error: WebcamInitError): void {
    this.errors.push(error);
  }

  public showNextWebcam(directionOrDeviceId: boolean|string): void {
    // true => move forward through devices
    // false => move backwards through devices
    // string => move to device with given deviceId
    this.nextWebcam.next(directionOrDeviceId);
  }

  public handleImage(webcamImage: WebcamImage): void {
    console.info('received webcam image', webcamImage);
    this.image = webcamImage.imageAsDataUrl;
    this.pictureTaken.emit(webcamImage);
  }

  public cameraWasSwitched(deviceId: string): void {
    console.log('active device: ' + deviceId);
    this.deviceId = deviceId;
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean|string> {
    return this.nextWebcam.asObservable();
  }

  mouseDown($event:any) {
    const mouseX:number = $event.offsetX;
    const mouseY:number = $event.offsetY;
    console.log("this", this)
    for (const result of this.results) {
      if (result && result.boundingPoly && result.boundingPoly.vertices) {
        const vertices = result.boundingPoly.vertices;
        let topLeft = vertices[0]
        let bottomRight = vertices[2]

        if (
          ((topLeft.x ?? 0) <= mouseX) && ((topLeft.y ?? 0) <= mouseX) &&
          ((bottomRight.x ?? 0) >= mouseX) && ((bottomRight.y ?? 0) >= mouseY)
          ){
            console.log(mouseX+"."+mouseY, result)
          }
      }
    }
  }

  initCanvas(){
    if (!this.image !== null) {
      console.log("canvas", this.outputCanvas.nativeElement);
      this.cx = this.outputCanvas.nativeElement.getContext("2d");
      this.outputCanvas.nativeElement.addEventListener('mousedown', this.mouseDown, false);
      this.outputCanvas.nativeElement.addEventListener('touchstart', this.mouseDown, false);
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
          //console.log('recognizeText', results);
          this.results = results;
          if (this.cx !== null) {
            this.cx.clearRect(0, 0, this.outputCanvas.nativeElement.width, this.outputCanvas.nativeElement.height);
            let first: boolean = true;
            let prevHeight: number = -1;
            let prevVertices: protos.google.cloud.vision.v1.IVertex[] = [];
            for (const result of results) {
                if (!first && result && result.boundingPoly && result.boundingPoly.vertices) {
                  const vertices = result.boundingPoly.vertices;
                  let topLeft = vertices[0]
                  let topRight = vertices[1]
                  let bottomLeft = vertices[3]
                  let bottomRight = vertices[2]
                  const width = (topRight.x ?? 0) - (topLeft.x ?? 0);
                  const height = (bottomLeft.y ?? 0) - (topLeft.y ?? 0);
                  //console.log(width+"x"+height, vertices);
                  this.cx.beginPath();
                  this.cx.lineWidth = 2;
                  this.cx.fillStyle = "rgba(199, 87, 231, 0.2)";
                  this.cx.strokeStyle = "#c757e7";

                  const diffHeight = Math.abs(height - prevHeight);
                  const ratioHeight: number = diffHeight / height;
                  /*
                  if (ratioHeight < 0.05) {
                    console.log(ratioHeight, "Merging !");
                    vertices[0].x = topLeft.x = Math.min(topLeft.x ?? 0, prevVertices[0].x ?? 0)
                    vertices[0].y = topLeft.y = Math.min(topLeft.y ?? 0, prevVertices[0].y ?? 0)
                    vertices[1].x = topRight.x = Math.max(topRight.x ?? 0, prevVertices[1].x ?? 0)
                    vertices[1].y = topRight.y = Math.min(topLeft.y ?? 0, prevVertices[1].y ?? 0)
                    vertices[3].x = bottomLeft.x = Math.min(bottomLeft.x ?? 0, prevVertices[3].x ?? 0)
                    vertices[3].y = bottomLeft.y = Math.max(bottomLeft.y ?? 0, prevVertices[3].y ?? 0)
                    vertices[2].x = bottomRight.x = Math.max(bottomRight.x ?? 0, prevVertices[2].x ?? 0)
                    vertices[2].y = bottomRight.y = Math.max(bottomRight.y ?? 0, prevVertices[2].y ?? 0)
                    this.cx.lineWidth = 3;
                    this.cx.strokeStyle = "#000000";
                  }
                  */
                  prevVertices = vertices;

                  this.cx.moveTo(topLeft.x ?? 0, topLeft.y ?? 0);
                  this.cx.lineTo(topRight.x ?? 0, topRight.y ?? 0);
                  this.cx.lineTo(bottomRight.x ?? 0, bottomRight.y ?? 0);
                  this.cx.lineTo(bottomLeft.x ?? 0, bottomLeft.y ?? 0);
                  this.cx.lineTo(topLeft.x ?? 0, topLeft.y ?? 0);

                  //this.cx.lineTo(bottomRight.x ?? 0, bottomRight.y ?? 0);
                  //this.cx.moveTo(topRight.x ?? 0, topRight.y ?? 0);
                  //this.cx.lineTo(bottomLeft.x ?? 0, bottomLeft.y ?? 0);

                  this.cx.fill();
                  this.cx.stroke();
                  prevHeight = height;
                }
                first = false;
            }
          }
          const regexp = /[\n|\r]?([^:]+:[^\n\r]*)/g;
          const matches = results[0].description.matchAll(regexp);
          this.medicalRecords.clear();
          this.results = [];
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
