import { Component, OnInit } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { StateService } from '../state.service';
import { ApiService } from '../api.service';
import { ModalService } from '../modal.service';

@Component({
    selector: 'app-image',
    templateUrl: './image.component.html',
    styleUrls: ['./image.component.css'],
    animations: [
        trigger('slideInOut', [
            state('in', style({
                transform: 'translate3d(0, 0, 0)',
                opacity: '1'
            })),
            state('out', style({
                transform: 'translate3d(100%, 0, 0)',
                opacity: '0'
            })),
            transition('in => out', animate('400ms ease-in-out')),
            transition('out => in', animate('400ms ease-in-out'))
        ]),
    ]
})
export class ImageComponent implements OnInit {
    image: string;
    configState: string = "out";

    constructor(private api: ApiService, private state: StateService, private modals: ModalService) {
        this.state.get("image").subscribe(value => {
            //console.log("image", value);
            this.image = value
        });
        this.state.get("modal").subscribe(value => {
            if (value === undefined) {
                // we're closed
                this.configState = "out";
            }
        });
        this.state.get("configuring").subscribe(value => {
            if (value == false && this.configState == "in")
                this.configState = "out";
        });
    }

    ngOnInit() {
        (<HTMLElement>document.querySelector("#image .center-modal")).style.overflow = "hidden";
    }

    close() {
        this.modals.close("image");
    }

    settings() {
        this.configState = (this.configState === "out") ? "in" : "out";
    }

    animationDone(event) {
        //console.log("done?", event);
        this.state.set("configuring", (event.toState === "in"));
    }
}
