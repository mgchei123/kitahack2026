import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from './services/gemini';
import { Firestore, collection, getDocs } from '@angular/fire/firestore';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Project Leader Dashboard</h1>

      <button (click)="testAI()">Test Gemini AI</button>
      <p><strong>AI Says:</strong> {{ aiResponse }}</p>

      <hr>

      <button (click)="testFirebase()">Test Database</button>
      <p><strong>DB Status:</strong> {{ dbStatus }}</p>
    </div>
  `
})
export class AppComponent {
  private gemini = inject(GeminiService);
  private firestore = inject(Firestore);

  aiResponse = 'Waiting...';
  dbStatus = 'Waiting...';

  async testAI() {
    this.aiResponse = 'Thinking...';
    this.aiResponse = await this.gemini.generateText('Hello! Are you ready?');
  }

  async testFirebase() {
    try {
      // Tries to read a collection named 'test' (doesn't need to exist, just checking connection)
      const ref = collection(this.firestore, 'test');
      await getDocs(ref); 
      this.dbStatus = 'Connected! (Read success)';
    } catch (err: any) {
      this.dbStatus = 'Connection Failed: ' + err.message;
    }
  }
}