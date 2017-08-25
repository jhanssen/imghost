import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { RouterModule, Routes }  from '@angular/router';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MdButtonModule, MdToolbarModule, MdSelectModule, MdInputModule } from '@angular/material';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { ApiService } from './api.service';
import { StateService } from './state.service';
import { ModalService } from './modal.service';
import { PermissionsService } from './permissions.service';
import { DropTargetDirective } from './drop-target.directive';
import { UploadComponent } from './upload/upload.component';
import { ImageGridComponent } from './image-grid/image-grid.component';
import { ModalComponent } from './modal/modal.component';
import { ImageComponent } from './image/image.component';
import { ImageConfigComponent } from './image-config/image-config.component';
import { PermissionsComponent } from './permissions/permissions.component';
import { UserComponent } from './user/user.component';

const routes: Routes = [
    { path: '', component: UserComponent },
    { path: 'user/:id', component: UserComponent }
];

@NgModule({
    declarations: [
        AppComponent,
        DropTargetDirective,
        UploadComponent,
        ImageGridComponent,
        ModalComponent,
        ImageComponent,
        ImageConfigComponent,
        PermissionsComponent,
        UserComponent
    ],
    imports: [
        BrowserAnimationsModule,
        BrowserModule,
        FormsModule,
        HttpModule,
        MdButtonModule,
        MdToolbarModule,
        MdSelectModule,
        MdInputModule,
        RouterModule.forRoot(routes)
    ],
    providers: [
        ApiService,
        StateService,
        ModalService,
        PermissionsService
    ],
    bootstrap: [AppComponent]
})
export class AppModule { }
