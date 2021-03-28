
import { HttpRegionParserResult, HttpRegionParser, ParserContext } from '../models';
import { getRegionName } from '../utils';
import inquirer from 'inquirer';



export class NoteMetaHttpRegionParser implements HttpRegionParser{

  constructor(private readonly showNote: (note: string) => Promise<boolean>){}

  async parse(lineReader: unknown, context: ParserContext): Promise<HttpRegionParserResult>{
    return false;
  }

  close({httpRegion, httpFile}: ParserContext): void {
    if (httpRegion.metaData.note) {
      const note = httpRegion.metaData.note || `Are you sure you want to send the request ${getRegionName(httpRegion)}?`;
      httpRegion.actions.splice(0, 0, {
        type: 'note',
        processor: () => this.showNote(note)
      });
    }
  }
}


