import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment.development';

import { AngularFireModule } from '@angular/fire/compat';
import {
  AngularFireFunctionsModule,
  USE_EMULATOR,
} from '@angular/fire/compat/functions';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialFileInputModule } from 'ngx-material-file-input';

import { ObjectDialogComponent } from './object-dialog/object-dialog.component';
import { ObjectRecognitionComponent } from './object-recognition/object-recognition.component';
import { SortConfidencePipe } from './sort-confidence.pipe';

@NgModule({
  declarations: [
    AppComponent,
    ObjectRecognitionComponent,
    ObjectDialogComponent,
    SortConfidencePipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatToolbarModule,
    MatButtonModule,
    FlexLayoutModule,
    MatFormFieldModule,
    MaterialFileInputModule,
    MatIconModule,
    MatListModule,
    MatDialogModule,
    AppRoutingModule,
    AngularFireModule.initializeApp(environment.firebase),
    provideFirebaseApp(() => initializeApp({"projectId":"nonnoapp-39c5d","appId":"1:998628285176:web:2c689cdf5d8d9f007ab90d","storageBucket":"nonnoapp-39c5d.appspot.com","apiKey":"AIzaSyBGH0u6Rcw9Uuln4mHS2dyA-MWYlb7mbmQ","authDomain":"nonnoapp-39c5d.firebaseapp.com","messagingSenderId":"998628285176"})),
    //provideFunctions(() => getFunctions()),
    AngularFireFunctionsModule
  ],
  providers: [
    provideClientHydration(),
    { provide: USE_EMULATOR, useValue: ['localhost', 5001] }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
