import {setupWorker} from 'msw/browser';
import {handlers,resetMocks} from './handlers';
// Initialize the browser simulator to the same deterministic baseline as tests.
resetMocks();
export const worker=setupWorker(...handlers);
