import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MdButtonModule, MdCheckboxModule } from '@angular/material';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { ApiService } from './api.service';
import { DragService } from './drag.service';
import { DropTargetDirective } from './drop-target.directive';
import { UploadComponent } from './upload/upload.component';

@NgModule({
    declarations: [
        AppComponent,
        DropTargetDirective,
        UploadComponent
    ],
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule,
        HttpModule
    ],
    providers: [ApiService, DragService],
    bootstrap: [AppComponent]
})
export class AppModule { }
