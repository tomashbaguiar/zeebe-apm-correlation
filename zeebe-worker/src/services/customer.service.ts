export class CustomerService {
    public getSizeFromId(id: number): number {
        return id + id;
    }
    
    public getIdFromSize(size: number): number {
        return size / 2;
    }
}
