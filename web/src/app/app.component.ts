import { Component } from '@angular/core';
import { ApiService } from './api.service';
import { StateService } from './state.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    title = 'app';
    authenticated = true;
    authenticators: Array<string> = [];
    images = undefined;
    uploading = false;

    constructor(private api: ApiService, private state: StateService) {
        this.refresh();
        this.state.get("uploading").subscribe(value => {
            if (this.uploading && !value) {
                // refresh images
                this.refresh();
            }
            this.uploading = value;
        });
    }

    refresh() {
        this.api.get("/images").subscribe(data => {
            if (data.status === 401) {
                this.authenticated = false;
                this.api.get("/auth").subscribe(data => {
                    console.log(data instanceof Array);
                    if (data instanceof Array)
                        this.authenticators = data;
                });
            } else if (data instanceof Array) {
                //console.log("data", data);
                this.images = data;
            }
        });
    }

    upload() {
        this.state.set("uploading", true);
    }
}
