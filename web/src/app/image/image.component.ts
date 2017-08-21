import { Component, OnInit } from '@angular/core';
import { StateService } from '../state.service';

@Component({
  selector: 'app-image',
  templateUrl: './image.component.html',
  styleUrls: ['./image.component.css']
})
export class ImageComponent implements OnInit {
    image: string;

    constructor(private state: StateService) {
        this.state.get("image").subscribe(value => {
            //console.log("image", value);
            this.image = value
        });
    }

    ngOnInit() {
    }
}
