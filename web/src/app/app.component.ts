import { Component } from '@angular/core';
import { ApiService } from './api.service';
import { StateService } from './state.service';
import { ModalService } from './modal.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    title = 'Imghost';
    authenticated = true;
    authenticators: Array<string> = [];
    images = undefined;

    constructor(private api: ApiService, private state: StateService, private modals: ModalService) {
        this.refresh();
        this.state.get("refresh").subscribe(value => {
            if (value) {
                this.refresh();
                this.state.set("refresh", false);
            }
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

    openModal(id: string) {
        this.modals.open(id);
    }
}
