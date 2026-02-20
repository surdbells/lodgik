import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { NativeScriptModule, NativeScriptFormsModule, NativeScriptHttpClientModule } from '@nativescript/angular';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
@NgModule({ bootstrap: [AppComponent], imports: [NativeScriptModule, NativeScriptFormsModule, NativeScriptHttpClientModule, AppRoutingModule], declarations: [AppComponent], schemas: [NO_ERRORS_SCHEMA] })
export class AppModule {}
