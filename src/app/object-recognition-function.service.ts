import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { protos } from '@google-cloud/vision';
import { Observable } from 'rxjs';

type AnnotatePayload = {
  image: string;
};

export type LabelDetected = {
  description: string;
  score?: number | null;
  boundingPoly?: protos.google.cloud.vision.v1.IBoundingPoly | null;
};

@Injectable({
  providedIn: 'root',
})
export class ObjectRecognitionFunctionService {
  private callableAnnotateImage = this.angularFunction.httpsCallable<
    AnnotatePayload,
    LabelDetected[]
  >('annotateImage');

  private callableRecognizeText = this.angularFunction.httpsCallable<
  AnnotatePayload,
  LabelDetected[]
>('recognizeText');

  constructor(private angularFunction: AngularFireFunctions) {}

  recognizeObjectInImage(image: string): Observable<LabelDetected[]> {
    return this.callableAnnotateImage({ image: image.split(',')[1] });
  }

  recognizeTextInImage(image: string): Observable<LabelDetected[]> {
    return this.callableRecognizeText({ image: image.split(',')[1] });
  }
}
