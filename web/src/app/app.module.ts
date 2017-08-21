import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MdButtonModule, MdToolbarModule } from '@angular/material';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { ApiService } from './api.service';
import { DropTargetDirective } from './drop-target.directive';
import { StateService } from './state.service';
import { ModalService } from './modal.service';
import { UploadComponent } from './upload/upload.component';
import { ImageGridComponent } from './image-grid/image-grid.component';
import { ModalComponent } from './modal/modal.component';

@NgModule({
    declarations: [
        AppComponent,
        DropTargetDirective,
        UploadComponent,
        ImageGridComponent,
        ModalComponent
    ],
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule,
        HttpModule,
        MdButtonModule,
        MdToolbarModule
    ],
    providers: [
        ApiService,
        StateService,
        ModalService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
